/* ============================================================
   Synai — quiz flow + recommendation engine
   Genre taste + in-the-moment mood + movie/series lean.
   Runs once the live TMDB catalog has loaded (see tmdb.js).
   ============================================================ */
window.SynaiQuiz = function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  const els = {
    card: $('q-card'), kicker: $('q-kicker'), prompt: $('q-prompt'), body: $('q-body'),
    back: $('q-back'), count: $('q-count'), prog: $('prog-fill'), foot: $('q-foot'),
    results: $('results'), summary: $('taste-summary'), grid: $('rec-grid'),
    retake: $('retake'), stage: $('quiz-stage'),
  };

  const taste = {};   // genre dimensions
  const mood = {};    // mood tags
  let kindBias = 0;   // + favors Movie, - favors Series
  let recencyBias = 0;// + favors newer, - favors older
  let maturCap = 9;   // age-rating ceiling (1=family … 3=mature, 9=anything)
  let kindOnly = null;// 'Movie' or 'Series' to hard-restrict the result type
  let pickedGenres = []; // TMDB genre ids the user tapped (multi-select)
  let pickedKeywords = []; // TMDB theme keyword ids (multi-select)
  let pickedProviders = []; // TMDB watch-provider ids (multi-select)
  let filters = {};   // concrete query constraints: dateGte/Lte, lang, runtime*, acclaim
  let index = 0;
  const history = []; // deltas, for Back

  const moodsToObj = (arr) => (arr || []).reduce((o, k) => (o[k] = (o[k] || 0) + 2, o), {});
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

  /* ---- estimate a title's maturity (0 family … 3 mature) ---
     Uses the real US rating when it's been loaded, otherwise a
     reasonable guess from genre so the question still has bite. */
  const RATING_MATUR = {
    'G': 0, 'TV-Y': 0, 'TV-G': 0, 'TV-Y7': 0, 'PG': 1, 'TV-PG': 1,
    'PG-13': 2, 'TV-14': 2, 'R': 3, 'NC-17': 3, 'TV-MA': 3,
  };
  const GENRE_MATUR = {
    animation: 1, comedy: 1.5, romance: 1.5, fantasy: 1.5,
    drama: 2, action: 2, scifi: 2, mystery: 2, thriller: 2.7, crime: 2.7,
  };
  const estMaturity = (m) => {
    const r = RATING_MATUR[m.rating];
    return r != null ? r : (GENRE_MATUR[m.genre] != null ? GENRE_MATUR[m.genre] : 2);
  };

  /* ---- build a fresh quiz every run ------------------------
     The core questions (mature?, craving?, era?) are always asked
     and lead the quiz; a random handful of the mood questions
     follow to fine-tune. No more movie-vs-movie matchups. */
  // a few mood questions add nuance on top of the hard filters
  const MOOD_PER_QUIZ = 3;

  const prep = (q) => ({ type: 'mood', kicker: q.kicker, q: q.q, options: shuffle(q.options.slice()) });
  // filter questions keep their natural order (eras, lengths read better in sequence)
  const prepOrdered = (q) => ({ type: 'mood', kicker: q.kicker, q: q.q, movieOnly: q.movieOnly, options: q.options.slice() });

  // runtime only makes sense for movies — hide it once they've chosen a show
  const skipQ = (q) => !!q.movieOnly && kindOnly === 'Series';

  function buildQuiz() {
    const maturity = prep(CORE_QUESTIONS[0]);
    const movieShow = prep(CORE_QUESTIONS[1]);
    const serviceQ = { type: 'pick', target: 'provider', list: PROVIDER_PICKER, kicker: 'Your services', q: 'Which streaming services do you use? Pick any — or none to search everywhere.' };
    const genreQ = { type: 'pick', target: 'genre', list: GENRE_PICKER, kicker: 'Your genres', q: 'Which genres are you feeling? Pick any.' };
    const themeQ = { type: 'pick', target: 'keyword', list: KEYWORD_PICKER, kicker: 'The theme', q: 'Any themes you’re after? Pick any.' };
    const filterQs = FILTER_QUESTIONS.map(prepOrdered);          // era, origin, length, pedigree
    const moods = shuffle(MOOD_POOL).slice(0, MOOD_PER_QUIZ).map(prep);
    // funnel: broad → specific, then a little mood nuance
    return [maturity, movieShow, serviceQ, genreQ, themeQ].concat(filterQs, moods);
  }

  let QUESTIONS = buildQuiz();

  function applyDelta(d, sign) {
    for (const k in d.taste) taste[k] = (taste[k] || 0) + d.taste[k] * sign;
    for (const k in d.mood) mood[k] = (mood[k] || 0) + d.mood[k] * sign;
    kindBias += (d.kind || 0) * sign;
    recencyBias += (d.recency || 0) * sign;
    // maturity is a ceiling (set, not added); stash the previous value so Back can restore it
    if (d.maturity != null) {
      if (sign > 0) { d._prevMatur = maturCap; maturCap = d.maturity; }
      else { maturCap = (d._prevMatur != null) ? d._prevMatur : 9; }
    }
    // genre / keyword picks are sets; stash the previous list for Back
    if (d.genres) {
      if (sign > 0) { d._prevGenres = pickedGenres.slice(); pickedGenres = d.genres.slice(); }
      else { pickedGenres = d._prevGenres ? d._prevGenres.slice() : []; }
    }
    if (d.keywords) {
      if (sign > 0) { d._prevKeywords = pickedKeywords.slice(); pickedKeywords = d.keywords.slice(); }
      else { pickedKeywords = d._prevKeywords ? d._prevKeywords.slice() : []; }
    }
    if (d.providers) {
      if (sign > 0) { d._prevProviders = pickedProviders.slice(); pickedProviders = d.providers.slice(); }
      else { pickedProviders = d._prevProviders ? d._prevProviders.slice() : []; }
    }
    // movie/show is a hard choice (set, not added); stash previous for Back
    if ('only' in d) {
      if (sign > 0) { d._prevOnly = kindOnly; kindOnly = d.only || null; }
      else { kindOnly = (d._prevOnly !== undefined) ? d._prevOnly : null; }
    }
    // filter constraints (era/origin/length/pedigree) — stash prev values for Back
    if (d.set) {
      if (sign > 0) { d._prevSet = {}; for (const k in d.set) { d._prevSet[k] = filters[k]; filters[k] = d.set[k]; } }
      else if (d._prevSet) { for (const k in d._prevSet) filters[k] = d._prevSet[k]; }
    }
  }

  /* ---- render ---------------------------------------------- */
  function render() {
    const q = QUESTIONS[index];
    els.kicker.textContent = q.kicker || '';
    // count against only the questions this run will actually ask (skips excluded)
    const active = QUESTIONS.filter((x) => !skipQ(x));
    const pos = active.indexOf(q) + 1;
    els.count.textContent = `${pos} / ${active.length}`;
    els.prog.style.width = ((pos - 1) / active.length * 100) + '%';
    els.back.disabled = index === 0;

    els.prompt.textContent = q.q;

    if (q.type === 'pick') {
      const chosen = q.target === 'genre' ? pickedGenres : q.target === 'provider' ? pickedProviders : pickedKeywords;
      els.body.className = 'genre-pick';
      els.body.innerHTML =
        '<div class="gp-grid">' +
          q.list.map((g) => `<button class="gp-chip" type="button" data-g="${g.id}">${g.label}</button>`).join('') +
        '</div>' +
        '<button class="btn gp-next" type="button" data-gnext>Continue <span class="arr">→</span></button>';
      // restore earlier picks (for Back)
      chosen.forEach((id) => {
        const b = els.body.querySelector(`[data-g="${id}"]`);
        if (b) b.classList.add('on');
      });
    } else {
      els.body.className = 'opts';
      els.body.innerHTML = q.options.map((o, i) =>
        `<button class="opt" type="button" data-opt="${i}">` +
          `<span class="opt-label">${o.label}</span>` +
          (o.sub ? `<span class="opt-sub">${o.sub}</span>` : '') +
        `</button>`
      ).join('');
    }

    if (!reduce) { els.card.style.animation = 'none'; void els.card.offsetWidth; els.card.style.animation = 'rise .45s cubic-bezier(.2,.7,.2,1)'; }
  }

  /* ---- choice handling ------------------------------------- */
  function advance(delta, markEl) {
    if (markEl) markEl.classList.add('chosen');
    applyDelta(delta, +1);
    history.push(delta);
    setTimeout(() => {
      let next = index + 1;
      while (next < QUESTIONS.length && skipQ(QUESTIONS[next])) next++;
      if (next < QUESTIONS.length) { index = next; render(); }
      else finish();
    }, reduce ? 0 : 240);
  }

  els.body.addEventListener('click', (e) => {
    const q = QUESTIONS[index];
    if (q.type === 'pick') {
      const chip = e.target.closest('[data-g]');
      if (chip) { chip.classList.toggle('on'); return; }
      if (e.target.closest('[data-gnext]')) {
        const ids = Array.from(els.body.querySelectorAll('.gp-chip.on')).map((b) => +b.dataset.g);
        if (q.target === 'genre') {
          const dims = (window.SynaiTMDB && window.SynaiTMDB.genreToDims) ? window.SynaiTMDB.genreToDims(ids) : {};
          for (const k in dims) dims[k] *= 2; // lean the ranking meaningfully
          advance({ taste: dims, mood: {}, genres: ids }, null);
        } else if (q.target === 'provider') {
          advance({ taste: {}, mood: {}, providers: ids }, null);
        } else {
          advance({ taste: {}, mood: {}, keywords: ids }, null);
        }
      }
      return;
    }
    const opt = e.target.closest('[data-opt]');
    if (opt) {
      const o = q.options[+opt.dataset.opt];
      const delta = {
        taste: o.dims || {}, mood: moodsToObj(o.moods),
        kind: o.kind || 0, recency: o.recency || 0, maturity: o.maturity,
      };
      if ('only' in o) delta.only = o.only || null; // movie/show question
      if (o.set) delta.set = o.set;                  // filter question (era/origin/length/pedigree)
      advance(delta, opt);
    }
  });

  els.back.addEventListener('click', () => {
    if (index === 0) return;
    // find the previous question that was actually asked (before undoing, since
    // skips depend on the still-current movie/show answer)
    let prev = index - 1;
    while (prev > 0 && skipQ(QUESTIONS[prev])) prev--;
    const last = history.pop();
    if (last) applyDelta(last, -1);
    index = prev; render();
  });

  /* ---- recommendation engine ------------------------------- */
  function scoreItem(m) {
    let s = 0;
    for (const k in m.tags) s += (taste[k] || 0) * m.tags[k];
    for (const k of m.moods) s += (mood[k] || 0) * 1.5;
    s += kindBias * (m.kind === 'Movie' ? 1.5 : -1.5);
    // recency: reward newer/older to taste (year normalized around ~2010)
    if (recencyBias && m.year) s += recencyBias * ((m.year - 2010) / 6);
    // age-rating ceiling: sink anything above the comfort level (skip items
    // already proven within the cap by the cert-bounded fetch)
    if (maturCap < 9 && m._capSafe == null) {
      const over = estMaturity(m) - maturCap;
      if (over > 0) s -= 1000 * over;
    }
    return s;
  }

  /* ratings allowed at each comfort level (for curated, known-rating titles) */
  const ALLOWED = {
    1: new Set(['G', 'TV-Y', 'TV-Y7', 'TV-G', 'PG', 'TV-PG']),
    2: new Set(['G', 'TV-Y', 'TV-Y7', 'TV-G', 'PG', 'TV-PG', 'PG-13', 'TV-14']),
    3: null, // mature: anything below NC-17 is fine
  };
  const ratingFitsCap = (rating, cap) => {
    if (cap >= 9 || cap === 3) return rating !== 'NC-17';
    const set = ALLOWED[cap];
    return set ? set.has(rating) : true;
  };

  /* Build the pool the recommendations are drawn from. It is fetched
     fresh with a hard certification bound so "family-friendly" can
     NEVER include PG-13+, plus any curated titles that fit the cap. */
  async function buildPool() {
    let pool = [];
    if (window.SynaiTMDB && window.SynaiTMDB.discoverPrecise) {
      pool = await window.SynaiTMDB.discoverPrecise({
        cap: maturCap, kindOnly,
        genreIds: pickedGenres, keywordIds: pickedKeywords, providerIds: pickedProviders,
        dateGte: filters.dateGte, dateLte: filters.dateLte,
        lang: filters.lang, runtimeGte: filters.runtimeGte, runtimeLte: filters.runtimeLte,
        acclaim: filters.acclaim,
      });
    }
    // fold in curated titles that satisfy the chosen genres + rating cap
    const wantKeys = (window.SynaiTMDB && window.SynaiTMDB.genreToDims)
      ? Object.keys(window.SynaiTMDB.genreToDims(pickedGenres)) : [];
    const fit = (typeof CURATED !== 'undefined' ? CURATED : []).filter((m) =>
      ratingFitsCap(m.rating, maturCap)
      && (!wantKeys.length || wantKeys.includes(m.genre))
      && (!filters.lang || filters.lang === 'en')        // curated set is English-language
      && !pickedProviders.length);  // can't verify curated titles are on their services
    fit.forEach((m) => { m._capSafe = maturCap; });
    const seenIds = new Set(pool.map((m) => m.id));
    fit.forEach((m) => { if (!seenIds.has(m.id)) { seenIds.add(m.id); pool.push(m); } });
    return pool;
  }

  function topKeys(obj, n) {
    return Object.keys(obj).filter((k) => obj[k] > 0).sort((a, b) => obj[b] - obj[a]).slice(0, n);
  }

  async function finish() {
    els.prog.style.width = '100%';
    els.prompt.textContent = 'Finding your picks…';
    els.body.innerHTML = '';
    let pool = await buildPool();
    // honor an explicit movie/show choice (fall back to all if it'd be empty)
    if (kindOnly) {
      const only = pool.filter((m) => m.kind === kindOnly);
      if (only.length) pool = only;
    }
    const ranked = pool.map((m) => ({ m, s: scoreItem(m) })).sort((a, b) => b.s - a.s);
    const lo = ranked.length ? ranked[ranked.length - 1].s : 0;
    const hi = (ranked[0] && ranked[0].s) || 1;
    const span = (hi - lo) || 1;
    const top = ranked.slice(0, 12);

    const g = topKeys(taste, 2).map((k) => GENRE_LABEL[k]);
    const md = topKeys(mood, 2).map((k) => MOOD_LABEL[k]);
    const pills = [];
    const pill = (txt) => pills.push(`<span class="taste-pill">${txt}</span>`);
    if (kindOnly === 'Movie') pill('Just <b>Movies</b>');
    else if (kindOnly === 'Series') pill('Just <b>Shows</b>');
    if (pickedGenres.length) {
      const names = GENRE_PICKER.filter((x) => pickedGenres.includes(x.id)).map((x) => x.label).slice(0, 4);
      if (names.length) pill(`<b>${names.join(', ')}</b>`);
    }
    if (pickedKeywords.length) {
      const names = KEYWORD_PICKER.filter((x) => pickedKeywords.includes(x.id)).map((x) => x.label).slice(0, 3);
      if (names.length) pill(`Theme: <b>${names.join(', ')}</b>`);
    }
    if (pickedProviders.length) {
      const names = PROVIDER_PICKER.filter((x) => pickedProviders.includes(x.id)).map((x) => x.label).slice(0, 4);
      if (names.length) pill(`On <b>${names.join(', ')}</b>`);
    }
    const eraTxt = filters.dateGte || filters.dateLte
      ? (filters.dateGte ? filters.dateGte.slice(0, 4) : 'pre') + (filters.dateLte && filters.dateGte ? 's' : (filters.dateLte ? '-' + filters.dateLte.slice(0, 4) : 's'))
      : '';
    if (filters.dateGte || filters.dateLte) pill(`Era: <b>${eraTxt}</b>`);
    const langName = { en: 'English', ko: 'Korean', ja: 'Japanese', es: 'Spanish' }[filters.lang];
    if (langName) pill(`<b>${langName}</b>`);
    if (filters.runtimeLte && !filters.runtimeGte) pill('<b>Short</b>');
    else if (filters.runtimeGte && filters.runtimeGte >= 140) pill('<b>Epic length</b>');
    const accName = { acclaimed: 'Acclaimed', popular: 'Crowd-pleasers', hidden: 'Hidden gems' }[filters.acclaim];
    if (accName) pill(`<b>${accName}</b>`);
    md.forEach((x) => pill(`In the mood for <b>${x}</b>`));
    const matLabel = { 1: 'Family-friendly', 2: 'Up to PG-13', 3: 'Mature is fine' }[maturCap];
    if (matLabel) pill(`Keeping it <b>${matLabel}</b>`);
    els.summary.innerHTML = pills.length ? pills.join('') : `<span class="taste-pill">A bit of everything</span>`;

    els.grid.innerHTML = top.map((r, i) => {
      const pct = Math.round(70 + ((r.s - lo) / span) * 29);
      return (
        `<button class="rec" type="button" data-id="${r.m.id}" data-pct="${pct}" style="animation-delay:${i * 55}ms" aria-label="${r.m.title} — details">` +
          `<span class="r-rank">${i + 1}</span>` +
          `<span class="r-info" aria-hidden="true">ⓘ</span>` +
          `<img src="${IMG}${r.m.poster}" alt="${r.m.title} poster" width="500" height="750">` +
          `<figcaption><span class="r-title">${r.m.title}</span>` +
          `<span class="r-match">${pct}% match · ${r.m.kind}</span></figcaption>` +
        `</button>`
      );
    }).join('');

    els.card.style.display = 'none';
    els.foot.style.display = 'none';
    els.results.classList.add('show');
    els.results.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  els.grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const m = byId(card.dataset.id);
    window.openMovieModal(m, `${card.dataset.pct}% match for tonight`);
  });

  els.retake.addEventListener('click', () => {
    for (const k in taste) delete taste[k];
    for (const k in mood) delete mood[k];
    kindBias = 0; recencyBias = 0; maturCap = 9; kindOnly = null;
    pickedGenres = []; pickedKeywords = []; pickedProviders = []; filters = {};
    history.length = 0; index = 0;
    QUESTIONS = buildQuiz(); // fresh, different questions each time
    els.results.classList.remove('show');
    els.card.style.display = '';
    els.foot.style.display = '';
    render();
    els.stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* glow parallax */
  const glows = Array.from(document.querySelectorAll('.glow'));
  if (!reduce && glows.length) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        glows.forEach((gl, i) => { gl.style.transform = `translateY(${y * (0.05 + i * 0.04)}px)`; });
        ticking = false;
      });
    }, { passive: true });
  }

  render();
};
