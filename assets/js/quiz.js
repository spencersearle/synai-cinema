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
  const MOOD_PER_QUIZ = 6;

  const prep = (q) => ({ type: 'mood', kicker: q.kicker, q: q.q, options: shuffle(q.options.slice()) });

  function buildQuiz() {
    const core = CORE_QUESTIONS.map(prep);                       // always, in order
    const extra = shuffle(MOOD_POOL).slice(0, MOOD_PER_QUIZ).map(prep);
    return core.concat(extra);
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
  }

  /* ---- render ---------------------------------------------- */
  function render() {
    const q = QUESTIONS[index];
    els.kicker.textContent = q.kicker || '';
    els.count.textContent = `${index + 1} / ${QUESTIONS.length}`;
    els.prog.style.width = (index / QUESTIONS.length * 100) + '%';
    els.back.disabled = index === 0;

    els.prompt.textContent = q.q;
    els.body.className = 'opts';
    els.body.innerHTML = q.options.map((o, i) =>
      `<button class="opt" type="button" data-opt="${i}">` +
        `<span class="opt-label">${o.label}</span>` +
        (o.sub ? `<span class="opt-sub">${o.sub}</span>` : '') +
      `</button>`
    ).join('');

    if (!reduce) { els.card.style.animation = 'none'; void els.card.offsetWidth; els.card.style.animation = 'rise .45s cubic-bezier(.2,.7,.2,1)'; }
  }

  /* ---- choice handling ------------------------------------- */
  function advance(delta, markEl) {
    if (markEl) markEl.classList.add('chosen');
    applyDelta(delta, +1);
    history.push(delta);
    setTimeout(() => {
      if (index < QUESTIONS.length - 1) { index++; render(); }
      else finish();
    }, reduce ? 0 : 240);
  }

  els.body.addEventListener('click', (e) => {
    const q = QUESTIONS[index];
    const opt = e.target.closest('[data-opt]');
    if (opt) {
      const o = q.options[+opt.dataset.opt];
      advance({
        taste: o.dims || {}, mood: moodsToObj(o.moods),
        kind: o.kind || 0, recency: o.recency || 0, maturity: o.maturity,
      }, opt);
    }
  });

  els.back.addEventListener('click', () => {
    if (index === 0) return;
    const last = history.pop();
    if (last) applyDelta(last, -1);
    index--; render();
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
    if (window.SynaiTMDB && window.SynaiTMDB.loadRatedPool) {
      pool = await window.SynaiTMDB.loadRatedPool(maturCap);
    }
    const fit = (typeof CURATED !== 'undefined' ? CURATED : []).filter((m) => ratingFitsCap(m.rating, maturCap));
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
    const pool = await buildPool();
    const ranked = pool.map((m) => ({ m, s: scoreItem(m) })).sort((a, b) => b.s - a.s);
    const lo = ranked.length ? ranked[ranked.length - 1].s : 0;
    const hi = (ranked[0] && ranked[0].s) || 1;
    const span = (hi - lo) || 1;
    const top = ranked.slice(0, 12);

    const g = topKeys(taste, 2).map((k) => GENRE_LABEL[k]);
    const md = topKeys(mood, 2).map((k) => MOOD_LABEL[k]);
    const pills = [];
    md.forEach((x) => pills.push(`<span class="taste-pill">In the mood for <b>${x}</b></span>`));
    g.forEach((x) => pills.push(`<span class="taste-pill">You lean <b>${x}</b></span>`));
    if (kindBias > 1) pills.push(`<span class="taste-pill">Leaning toward <b>Movies</b></span>`);
    else if (kindBias < -1) pills.push(`<span class="taste-pill">Leaning toward <b>Series</b></span>`);
    if (recencyBias > 1) pills.push(`<span class="taste-pill">Prefer <b>recent</b> picks</span>`);
    else if (recencyBias < -1) pills.push(`<span class="taste-pill">Prefer <b>timeless</b> picks</span>`);
    const matLabel = { 1: 'Family-friendly', 2: 'Up to PG-13', 3: 'Mature is fine' }[maturCap];
    if (matLabel) pills.push(`<span class="taste-pill">Keeping it <b>${matLabel}</b></span>`);
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
    kindBias = 0; recencyBias = 0; maturCap = 9; history.length = 0; index = 0;
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
