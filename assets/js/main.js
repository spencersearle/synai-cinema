/* ============================================================
   Synai — home: poster wall + gallery + live search
   Runs once the live TMDB catalog has loaded (see tmdb.js).
   ============================================================ */
window.SynaiHome = function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
  // titles to keep off the home screen entirely
  const BLOCK = new Set(['eyes wide shut']);
  // home screen only shows appropriate titles (mainly PG, some PG-13, no R)
  const safe = (arr) => arr.filter((m) =>
    (!window.SynaiTMDB || !window.SynaiTMDB.isHomeSafe || window.SynaiTMDB.isHomeSafe(m)) &&
    !BLOCK.has((m.title || '').toLowerCase()));

  const tileHTML = (m) =>
    `<button class="tile" type="button" data-id="${m.id}" aria-label="${m.title} — what it's about">` +
      `<img loading="lazy" src="${IMG}${m.poster}" alt="${m.title} poster" width="500" height="750">` +
      `<span class="t-info" aria-hidden="true">ⓘ</span>` +
      `<span class="t-cap">${m.title}${m.year ? ' · ' + m.year : ''}</span>` +
    `</button>`;

  /* ---- moving poster wall ---------------------------------- */
  const wall = document.getElementById('wall');
  if (wall) {
    wall.innerHTML = '';
    // keep the hero wall pleasant — drop the darker/scarier genres and
    // romance (its posters tend to be kissing shots)
    const SKIP = new Set(['thriller', 'crime', 'mystery', 'romance']);
    const nice = shuffle(safe(CATALOG).filter((m) => !SKIP.has(m.genre)));
    // hand-picked nice titles to feature up front
    const featured = [
      byId('lalaland'),
      byId('strangerthings'),
      { id: 'michael2026', title: 'Michael', poster: '/zm0KAbOjlt9eR5y7vDiL2dEOwMl.jpg' },
    ].filter(Boolean);
    const COLS = window.innerWidth < 560 ? 3 : window.innerWidth < 900 ? 4 : 6;
    let pick = 0;
    for (let c = 0; c < COLS; c++) {
      const col = document.createElement('div');
      col.className = 'wall-col ' + (c % 2 ? 'down' : 'up');
      col.style.setProperty('--dur', (52 + c * 7) + 's');
      const run = nice.slice(pick, pick + 8); pick += 8;
      if (featured[c]) run.unshift(featured[c]); // lead the first columns with a featured title
      const seq = run.concat(run);
      col.innerHTML = seq.map((m) =>
        `<img loading="lazy" src="${IMG}${m.poster}" alt="${m.title} poster" width="500" height="750">`
      ).join('');
      wall.appendChild(col);
    }
  }

  /* ---- gallery: genre filter + 50-at-a-time "See more" ----- */
  const grid = document.getElementById('poster-grid');
  const searchInput = document.getElementById('catalog-search');
  const status = document.getElementById('search-status');
  const filterBar = document.getElementById('genre-filter');
  const seeMoreRow = document.getElementById('see-more-row');
  const seeMore = document.getElementById('see-more');

  if (grid) {
    const PAGE = 48;         // titles revealed per "See more"
    let activeGenre = 'all';
    let shown = 0;           // how many of the current filter are on screen
    let searching = false;
    let busy = false;

    const append = (items) => { grid.insertAdjacentHTML('beforeend', items.map(tileHTML).join('')); };
    const filtered = () => { const list = safe(CATALOG); return activeGenre === 'all' ? list : list.filter((m) => m.genre === activeGenre); };

    function renderPage(reset) {
      if (reset) { grid.innerHTML = ''; shown = 0; }
      const list = filtered();
      append(list.slice(shown, shown + PAGE));
      shown = Math.min(shown + PAGE, list.length);
      if (seeMoreRow) seeMoreRow.style.display = shown < list.length || activeGenre === 'all' ? '' : 'none';
      if (status) {
        const label = activeGenre === 'all' ? 'titles' : GENRE_LABEL[activeGenre];
        status.textContent = `Showing ${shown.toLocaleString()} of ${list.length.toLocaleString()} ${label}`;
      }
    }

    // build genre filter chips from the genres actually present
    if (filterBar) {
      const present = Object.keys(GENRE_LABEL).filter((g) => safe(CATALOG).some((m) => m.genre === g));
      const chip = (g, label) => `<button class="genre-chip${g === 'all' ? ' on' : ''}" type="button" data-genre="${g}">${label}</button>`;
      filterBar.innerHTML = chip('all', 'All') + present.map((g) => chip(g, GENRE_LABEL[g])).join('');
      filterBar.addEventListener('click', (e) => {
        const b = e.target.closest('[data-genre]');
        if (!b || searching) return;
        activeGenre = b.dataset.genre;
        filterBar.querySelectorAll('.genre-chip').forEach((c) => c.classList.toggle('on', c === b));
        renderPage(true);
      });
    }

    renderPage(true);

    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('[data-id]');
      if (tile) window.openMovieModal(byId(tile.dataset.id));
    });

    // See more: reveal another 50; for "All", page in fresh live titles when low
    if (seeMore) {
      seeMore.addEventListener('click', async () => {
        if (busy) return;
        busy = true; seeMore.textContent = 'Loading…';
        try {
          if (shown >= filtered().length - PAGE && window.SynaiTMDB) {
            await window.SynaiTMDB.loadMore();
          }
          renderPage(false);
        } finally { busy = false; seeMore.textContent = 'See more'; }
      });
    }

    if (searchInput && window.SynaiTMDB) {
      let timer, seq = 0;
      const setBrowseChrome = (on) => {
        if (filterBar) filterBar.style.display = on ? '' : 'none';
        if (seeMoreRow) seeMoreRow.style.display = on ? '' : 'none';
      };
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        const q = searchInput.value.trim();
        if (!q) { searching = false; setBrowseChrome(true); renderPage(true); return; }
        searching = true; setBrowseChrome(false);
        if (status) status.textContent = 'Searching…';
        timer = setTimeout(async () => {
          const mine = ++seq;
          const results = await window.SynaiTMDB.search(q);
          if (mine !== seq) return; // a newer keystroke won
          grid.innerHTML = '';
          if (!results.length) { if (status) status.textContent = `No matches for “${q}”`; return; }
          if (status) status.textContent = `${results.length} result${results.length > 1 ? 's' : ''} for “${q}”`;
          append(results);
        }, 280);
      });
    }
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
};
