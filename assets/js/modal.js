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
    moods: document.getElementById('m-moods'),
    overview: document.getElementById('m-overview'),
    match: document.getElementById('m-match'),
    close: modal.querySelector('.modal-close'),
  };
  let lastFocused = null;

  function open(m, matchText) {
    if (!m) return;
    lastFocused = document.activeElement;
    els.poster.src = IMG + m.poster;
    els.poster.alt = m.title + ' poster';
    els.meta.innerHTML = `${m.year} · ${m.kind} · <span class="m-rating">${m.rating}</span> · ${GENRE_LABEL[m.genre]}`;
    els.title.textContent = m.title;
    els.moods.innerHTML = (m.moods || []).map((x) => `<span class="m-mood">${MOOD_LABEL[x]}</span>`).join('');
    els.overview.textContent = m.overview;
    if (matchText) { els.match.textContent = matchText; els.match.style.display = ''; }
    else { els.match.style.display = 'none'; }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('open'));
    els.close.focus();
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
