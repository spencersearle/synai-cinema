/* ============================================================
   Synai — quiz flow + recommendation engine
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  const els = {
    card: $('q-card'), prompt: $('q-prompt'), matchup: $('matchup'),
    pickA: $('pick-a'), pickB: $('pick-b'), back: $('q-back'),
    count: $('q-count'), prog: $('prog-fill'), foot: $('q-foot'), hint: $('q-hint'),
    results: $('results'), summary: $('taste-summary'), grid: $('rec-grid'),
    retake: $('retake'), stage: $('quiz-stage'),
  };

  const taste = {};
  let index = 0;
  const history = [];

  function paint(btn, m) {
    btn.classList.remove('chosen');
    btn.innerHTML =
      `<img src="${IMG}${m.poster}" alt="${m.title} poster" width="500" height="750">` +
      `<figcaption><span class="c-genre">${GENRE_LABEL[m.genre]}</span>` +
      `<span class="c-title">${m.title}</span></figcaption>`;
  }

  function render() {
    const q = MATCHUPS[index];
    paint(els.pickA, q.a);
    paint(els.pickB, q.b);
    els.count.textContent = `${index + 1} / ${MATCHUPS.length}`;
    els.prog.style.width = (index / MATCHUPS.length * 100) + '%';
    els.back.disabled = index === 0;
    if (!reduce) { els.card.style.animation = 'none'; void els.card.offsetWidth; els.card.style.animation = 'rise .45s cubic-bezier(.2,.7,.2,1)'; }
  }

  function applyTags(tags, sign) {
    for (const k in tags) taste[k] = (taste[k] || 0) + tags[k] * sign;
  }

  function choose(m, btn) {
    btn.classList.add('chosen');
    applyTags(m.tags, +1);
    history.push(m.tags);
    setTimeout(() => {
      if (index < MATCHUPS.length - 1) { index++; render(); }
      else finish();
    }, reduce ? 0 : 240);
  }

  function goBack() {
    if (index === 0) return;
    const last = history.pop();
    if (last) applyTags(last, -1);
    index--; render();
  }

  function topDimensions(n) {
    return Object.keys(taste).filter((k) => taste[k] > 0)
      .sort((a, b) => taste[b] - taste[a]).slice(0, n);
  }

  function finish() {
    els.prog.style.width = '100%';
    const ranked = CATALOG.map((m) => {
      let s = 0; for (const k in m.tags) s += (taste[k] || 0) * m.tags[k];
      return { m, s };
    }).sort((a, b) => b.s - a.s);
    const max = ranked[0].s || 1;
    const top = ranked.slice(0, 8);

    const dims = topDimensions(3);
    els.summary.innerHTML = dims.length
      ? dims.map((d) => `<span class="taste-pill">You lean <b>${GENRE_LABEL[d]}</b></span>`).join('')
      : `<span class="taste-pill">A bit of everything</span>`;

    els.grid.innerHTML = top.map((r, i) => {
      const pct = Math.round(62 + (r.s / max) * 37);
      return (
        `<figure class="rec" style="animation-delay:${i * 55}ms">` +
          `<span class="r-rank">${i + 1}</span>` +
          `<img src="${IMG}${r.m.poster}" alt="${r.m.title} poster" width="500" height="750">` +
          `<figcaption><span class="r-title">${r.m.title}</span>` +
          `<span class="r-match">${pct}% match · ${r.m.kind}</span></figcaption>` +
        `</figure>`
      );
    }).join('');

    els.card.style.display = 'none';
    els.foot.style.display = 'none';
    els.results.classList.add('show');
    els.results.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function retake() {
    for (const k in taste) delete taste[k];
    history.length = 0; index = 0;
    els.results.classList.remove('show');
    els.card.style.display = '';
    els.foot.style.display = '';
    render();
    els.stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  els.pickA.addEventListener('click', () => choose(MATCHUPS[index].a, els.pickA));
  els.pickB.addEventListener('click', () => choose(MATCHUPS[index].b, els.pickB));
  els.back.addEventListener('click', goBack);
  els.retake.addEventListener('click', retake);

  /* glow parallax */
  const glows = Array.from(document.querySelectorAll('.glow'));
  if (!reduce && glows.length) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        glows.forEach((g, i) => { g.style.transform = `translateY(${y * (0.05 + i * 0.04)}px)`; });
        ticking = false;
      });
    }, { passive: true });
  }

  render();
})();
