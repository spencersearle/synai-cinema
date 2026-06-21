/* ============================================================
   Synai — home: poster wall + gallery
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

  /* ---- moving poster wall ---------------------------------- */
  const wall = document.getElementById('wall');
  if (wall) {
    const COLS = window.innerWidth < 560 ? 3 : window.innerWidth < 900 ? 4 : 6;
    for (let c = 0; c < COLS; c++) {
      const col = document.createElement('div');
      col.className = 'wall-col ' + (c % 2 ? 'down' : 'up');
      col.style.setProperty('--dur', (52 + c * 7) + 's');
      // each column = a shuffled run, doubled for a seamless loop
      const run = shuffle(CATALOG).slice(0, 8);
      const seq = run.concat(run);
      col.innerHTML = seq.map((m) =>
        `<img loading="lazy" src="${IMG}${m.poster}" alt="${m.title} poster" width="500" height="750">`
      ).join('');
      wall.appendChild(col);
    }
  }

  /* ---- gallery grid (every title) -------------------------- */
  const grid = document.getElementById('poster-grid');
  if (grid) {
    grid.innerHTML = CATALOG.map((m) =>
      `<figure class="tile">` +
        `<img loading="lazy" src="${IMG}${m.poster}" alt="${m.title} poster" width="500" height="750">` +
        `<figcaption>${m.title} · ${m.year}</figcaption>` +
      `</figure>`
    ).join('');
  }

  /* ---- gentle glow parallax -------------------------------- */
  const glows = Array.from(document.querySelectorAll('.glow'));
  if (!reduce && glows.length) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        glows.forEach((g, i) => { g.style.transform = `translateY(${y * (0.06 + i * 0.05)}px)`; });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- reveal on scroll ------------------------------------ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();
