/* ============================================================
   Synai — shared movie-detail modal
   window.openMovieModal(item, matchText?)
   ============================================================ */
(function () {
  const modal = document.getElementById('movie-modal');
  if (!modal) return;

  const els = {
    poster: document.getElementById('m-poster'),
    meta: document.getElementById('m-meta'),
    title: document.getElementById('m-title'),
    facts: document.getElementById('m-facts'),
    moods: document.getElementById('m-moods'),
    overview: document.getElementById('m-overview'),
    cast: document.getElementById('m-cast'),
    scores: document.getElementById('m-scores'),
    watch: document.getElementById('m-watch'),
    match: document.getElementById('m-match'),
    close: modal.querySelector('.modal-close'),
  };
  let lastFocused = null;

  // paint the parts we always know about; called again after enrichment
  function paint(m) {
    els.meta.innerHTML = `${m.year} · ${m.kind} · <span class="m-rating">${m.rating}</span> · ${GENRE_LABEL[m.genre]}`;

    const isMovie = m.kind === 'Movie';
    const lengthText = isMovie
      ? (m.runtime || '')
      : (m.seasons ? `${m.seasons} season${m.seasons > 1 ? 's' : ''}` : '');
    const byText = m.by ? `${isMovie ? 'Directed by' : 'Created by'} ${m.by}` : '';
    els.facts.innerHTML = [lengthText, byText].filter(Boolean).join('  ·  ');

    els.overview.textContent = m.overview;
    // ratings: 🍅 Rotten Tomatoes critics + 🍿 audience
    if (els.scores) {
      const chips = [];
      if (m.tomato != null) {
        const fresh = m.tomato >= 60 ? ' fresh' : ' rotten';
        chips.push(`<span class="m-score${fresh}"><span class="m-score-ico">🍅</span>${m.tomato}% <span class="m-score-lbl">Critics</span></span>`);
      }
      if (m.audience != null) {
        chips.push(`<span class="m-score"><span class="m-score-ico">🍿</span>${m.audience}% <span class="m-score-lbl">Audience score</span></span>`);
      }
      els.scores.innerHTML = chips.join('');
      els.scores.style.display = chips.length ? '' : 'none';
    }

    const items = (arr) => arr.map((x) => `<span class="m-list-item">${x}</span>`).join('');
    els.cast.innerHTML = (m.cast && m.cast.length)
      ? `<span class="m-list-label">Starring</span>${items(m.cast)}`
      : '';
    els.cast.style.display = (m.cast && m.cast.length) ? '' : 'none';

    // where to watch (stacked vertically)
    if (els.watch) {
      let html = '';
      if (m.providers && m.providers.length) {
        html = `<span class="m-list-label">${m.watchKind || 'Streaming on'}</span>${items(m.providers)}`;
      } else if (m.watchKind) {
        html = `<span class="m-list-label">${m.watchKind}</span>`;
      }
      // if there's nothing to show, the line stays hidden
      els.watch.innerHTML = html;
      els.watch.style.display = html ? '' : 'none';
    }
  }

  let token = 0; // guards against a slow enrich landing after the modal changed

  function open(m, matchText) {
    if (!m) return;
    lastFocused = document.activeElement;
    const mine = ++token;
    els.poster.src = IMG + m.poster;
    els.poster.alt = m.title + ' poster';
    els.title.textContent = m.title;
    els.moods.innerHTML = (m.moods || []).map((x) => `<span class="m-mood">${MOOD_LABEL[x]}</span>`).join('');
    paint(m);
    if (matchText) { els.match.textContent = matchText; els.match.style.display = ''; }
    else { els.match.style.display = 'none'; }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('open'));
    els.close.focus();

    // pull runtime / seasons / director / cast / rating on demand
    if (!m._enriched && window.SynaiTMDB) {
      window.SynaiTMDB.enrich(m).then((full) => { if (mine === token) paint(full); });
    }
  }

  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    const done = () => { modal.hidden = true; modal.removeEventListener('transitionend', done); };
    modal.addEventListener('transitionend', done);
    setTimeout(done, 320); // fallback for reduced-motion
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  window.openMovieModal = open;
})();
