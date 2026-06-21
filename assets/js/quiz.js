/* ============================================================
   Synai — quiz flow + recommendation engine
   Genre taste + in-the-moment mood + movie/series lean.
   ============================================================ */
(function () {
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
  let index = 0;
  const history = []; // deltas, for Back

  const moodsToObj = (arr) => (arr || []).reduce((o, k) => (o[k] = (o[k] || 0) + 2, o), {});

  function applyDelta(d, sign) {
    for (const k in d.taste) taste[k] = (taste[k] || 0) + d.taste[k] * sign;
    for (const k in d.mood) mood[k] = (mood[k] || 0) + d.mood[k] * sign;
    kindBias += (d.kind || 0) * sign;
  }

  /* ---- render ---------------------------------------------- */
  function render() {
    const q = QUESTIONS[index];
    els.kicker.textContent = q.kicker || (q.type === 'match' ? 'This or that' : '');
    els.count.textContent = `${index + 1} / ${QUESTIONS.length}`;
    els.prog.style.width = (index / QUESTIONS.length * 100) + '%';
    els.back.disabled = index === 0;

    if (q.type === 'match') {
      els.prompt.innerHTML = 'Which one <em>wins</em> tonight?';
      els.body.className = 'matchup';
      els.body.innerHTML =
        pickHTML(q.a, 'a') + `<span class="vs" aria-hidden="true">or</span>` + pickHTML(q.b, 'b');
    } else {
      els.prompt.textContent = q.q;
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

  function pickHTML(m, side) {
    return (
      `<button class="pick" type="button" data-choice="${side}">` +
        `<img src="${IMG}${m.poster}" alt="${m.title} poster" width="500" height="750">` +
        `<figcaption><span class="c-genre">${GENRE_LABEL[m.genre]}</span>` +
        `<span class="c-title">${m.title}</span></figcaption>` +
      `</button>`
    );
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
    const pick = e.target.closest('[data-choice]');
    const opt = e.target.closest('[data-opt]');
    if (q.type === 'match' && pick) {
      const m = pick.dataset.choice === 'a' ? q.a : q.b;
      advance({ taste: m.tags, mood: moodsToObj(m.moods), kind: 0 }, pick);
    } else if (q.type === 'mood' && opt) {
      const o = q.options[+opt.dataset.opt];
      advance({ taste: o.dims || {}, mood: moodsToObj(o.moods), kind: o.kind || 0 }, opt);
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
    return s;
  }

  function topKeys(obj, n) {
    return Object.keys(obj).filter((k) => obj[k] > 0).sort((a, b) => obj[b] - obj[a]).slice(0, n);
  }

  function finish() {
    els.prog.style.width = '100%';
    const ranked = CATALOG.map((m) => ({ m, s: scoreItem(m) })).sort((a, b) => b.s - a.s);
    const lo = ranked[ranked.length - 1].s;
    const hi = ranked[0].s || 1;
    const span = (hi - lo) || 1;
    const top = ranked.slice(0, 12);

    const g = topKeys(taste, 2).map((k) => GENRE_LABEL[k]);
    const md = topKeys(mood, 2).map((k) => MOOD_LABEL[k]);
    const pills = [];
    md.forEach((x) => pills.push(`<span class="taste-pill">In the mood for <b>${x}</b></span>`));
    g.forEach((x) => pills.push(`<span class="taste-pill">You lean <b>${x}</b></span>`));
    if (kindBias > 1) pills.push(`<span class="taste-pill">Leaning toward <b>Movies</b></span>`);
    else if (kindBias < -1) pills.push(`<span class="taste-pill">Leaning toward <b>Series</b></span>`);
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
    kindBias = 0; history.length = 0; index = 0;
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
})();
