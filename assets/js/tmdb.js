/* ============================================================
   Synai — live TMDB catalog
   Fetches a large, real catalog of movies & TV at runtime and
   shapes each entry to match what the rest of the app expects
   (id, title, year, kind, genre, rating, poster, tags, moods,
   overview). Heavy detail (runtime/seasons/director/cast/rating)
   is fetched lazily the first time a title's modal is opened.

   Note: this key lives in the front-end, so it is visible in
   page source. That's fine for a free, rate-limited TMDB dev
   key on a personal project — it is not a billable secret.
   ============================================================ */
(function () {
  const KEY = 'c22340e73ccae0e2bc9baa35cb895e05';
  const API = 'https://api.themoviedb.org/3';
  // Optional: a free OMDb key unlocks the real Rotten Tomatoes Tomatometer.
  // Get one at omdbapi.com (free), paste it here, and the 🍅 score lights up.
  const OMDB_KEY = '';
  const url = (path, params = {}) => {
    const q = new URLSearchParams({ api_key: KEY, ...params });
    return `${API}${path}?${q}`;
  };

  /* ---- TMDB genre id  ->  Synai genre weights -------------- */
  // movie genre ids
  const MOVIE_GENRE = {
    28: { action: 3 }, 12: { action: 2, fantasy: 1 }, 16: { animation: 3 },
    35: { comedy: 3 }, 80: { crime: 3 }, 99: { drama: 1 }, 18: { drama: 3 },
    10751: { comedy: 1, animation: 1 }, 14: { fantasy: 3 }, 36: { drama: 2 },
    27: { thriller: 3 }, 10402: { drama: 1, comedy: 1 }, 9648: { mystery: 3 },
    10749: { romance: 3 }, 878: { scifi: 3 }, 10770: { drama: 1 },
    53: { thriller: 3 }, 10752: { drama: 2, action: 1 }, 37: { action: 2 },
  };
  // tv genre ids
  const TV_GENRE = {
    10759: { action: 3 }, 16: { animation: 3 }, 35: { comedy: 3 }, 80: { crime: 3 },
    99: { drama: 1 }, 18: { drama: 3 }, 10751: { comedy: 1, animation: 1 },
    10762: { animation: 2 }, 9648: { mystery: 3 }, 10763: { drama: 1 },
    10764: { drama: 1 }, 10765: { scifi: 2, fantasy: 1 }, 10766: { drama: 2, romance: 1 },
    10767: { comedy: 1 }, 10768: { drama: 2, action: 1 }, 37: { action: 2 },
  };

  /* ---- Synai genre  ->  in-the-moment mood leanings -------- */
  const GENRE_MOODS = {
    action: ['epic', 'intense'], drama: ['emotional'], comedy: ['feelgood'],
    scifi: ['mindbending', 'epic'], thriller: ['intense'], romance: ['emotional'],
    fantasy: ['epic'], crime: ['intense'], mystery: ['mindbending'],
    animation: ['feelgood', 'cozy'],
  };

  function buildTags(genreIds, kind) {
    const map = kind === 'Movie' ? MOVIE_GENRE : TV_GENRE;
    const tags = {};
    (genreIds || []).forEach((id) => {
      const w = map[id];
      if (!w) return;
      for (const k in w) tags[k] = Math.max(tags[k] || 0, w[k]);
    });
    if (!Object.keys(tags).length) tags.drama = 2; // sensible fallback
    return tags;
  }

  function pickGenre(tags) {
    return Object.keys(tags).sort((a, b) => tags[b] - tags[a])[0] || 'drama';
  }

  function buildMoods(tags) {
    const score = {};
    for (const g in tags) (GENRE_MOODS[g] || []).forEach((m) => { score[m] = (score[m] || 0) + tags[g]; });
    const out = Object.keys(score).sort((a, b) => score[b] - score[a]).slice(0, 3);
    return out.length ? out : ['emotional'];
  }

  /* Shape one raw TMDB record into a Synai catalog item. */
  function toItem(raw, kind) {
    const poster = raw.poster_path;
    if (!poster) return null; // no poster = useless on a poster-first site
    const title = raw.title || raw.name;
    const date = raw.release_date || raw.first_air_date || '';
    const tags = buildTags(raw.genre_ids, kind);
    return {
      id: `${kind === 'Movie' ? 'm' : 't'}${raw.id}`,
      tmdbId: raw.id,
      title,
      year: date ? +date.slice(0, 4) : '',
      kind,
      genre: pickGenre(tags),
      rating: 'NR',                 // filled on enrich
      poster,
      tags,
      moods: buildMoods(tags),
      overview: raw.overview || 'No description available yet.',
      popularity: raw.popularity || 0,
      _enriched: false,
    };
  }

  /* Convert chosen TMDB genre ids → Synai genre-dimension weights,
     so a genre pick boosts the matching titles in the ranking. */
  function genreToDims(ids) {
    const dims = {};
    (ids || []).forEach((id) => {
      const w = MOVIE_GENRE[id] || TV_GENRE[id];
      if (w) for (const k in w) dims[k] = (dims[k] || 0) + w[k];
    });
    return dims;
  }
  // movie genre id → closest TV genre id (null = no TV equivalent)
  const MOVIE_TO_TV = {
    28: 10759, 12: 10759, 16: 16, 35: 35, 80: 80, 99: 99, 18: 18, 10751: 10751,
    14: 10765, 36: 18, 27: null, 10402: null, 9648: 9648, 10749: null,
    878: 10765, 53: null, 10752: 10768, 37: 37,
  };

  /* ---- bulk load + grow-on-demand -------------------------
     The home catalog is kept APPROPRIATE: mainly PG (and G)
     movies with only some PG-13, and no R / NC-17. The quiz
     fetches a separate rating-bounded pool on demand (see
     loadRatedPool) so "mature is fine" can still reach R. */
  const RATING_UNSAFE = new Set(['R', 'NC-17', 'TV-MA']);
  const isHomeSafe = (m) => m._homeSafe === true || !RATING_UNSAFE.has(m.rating);

  const seen = new Set();    // title|year keys already in CATALOG
  const titleKey = (it) => `${it.title}|${it.year}`.toLowerCase();
  // cursor: how many pages of each home list we've consumed
  const cursor = { pg: 0, pg13: 0, tv: 0 };

  // generic discover fetch for one page-range, with extra filters
  async function discover(path, kind, from, to, extra = {}) {
    const reqs = [];
    for (let p = from; p <= to; p++) {
      reqs.push(fetch(url(path, { page: p, sort_by: 'popularity.desc', include_adult: 'false', 'vote_count.gte': 40, ...extra }))
        .then((r) => r.json()).catch(() => null));
    }
    const out = [];
    for (const res of await Promise.all(reqs)) {
      (res && res.results || []).forEach((raw) => { const it = toItem(raw, kind); if (it) out.push(it); });
    }
    return out;
  }

  // merge a batch into CATALOG, returning only the new ones
  function absorb(items) {
    const added = [];
    items.forEach((it) => { const k = titleKey(it); if (!seen.has(k)) { seen.add(k); CATALOG.push(it); added.push(it); } });
    return added;
  }

  const US = { certification_country: 'US' };
  const tag = (arr, props) => (arr.forEach((it) => Object.assign(it, props)), arr);
  const interleave = (a, b) => {
    const out = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); }
    return out;
  };

  // one batch of appropriate home titles: mostly PG/G movies, some PG-13, family-leaning TV
  async function homeBatch(pgPages, pg13Pages, tvPages) {
    const [pg, pg13, tv] = await Promise.all([
      discover('/discover/movie', 'Movie', cursor.pg + 1, cursor.pg + pgPages, { ...US, 'certification.lte': 'PG' }),
      discover('/discover/movie', 'Movie', cursor.pg13 + 1, cursor.pg13 + pg13Pages, { ...US, certification: 'PG-13' }),
      discover('/discover/tv', 'Series', cursor.tv + 1, cursor.tv + tvPages, { without_genres: '10763,10767,10764' }),
    ]);
    cursor.pg += pgPages; cursor.pg13 += pg13Pages; cursor.tv += tvPages;
    tag(pg, { _homeSafe: true }); tag(pg13, { _homeSafe: true, rating: 'PG-13' }); tag(tv, { _homeSafe: true });
    // PG-dominant movie list (PG first, then some PG-13), interleaved with TV
    return interleave(pg.concat(pg13), tv);
  }

  async function loadCatalog() {
    CATALOG = [];
    seen.clear();
    // curated titles lead; flag the family-safe ones so they can show on home
    const curated = (typeof CURATED !== 'undefined') ? CURATED : [];
    curated.forEach((m) => { if (!RATING_UNSAFE.has(m.rating)) m._homeSafe = true; });
    absorb(curated);
    // big first slab of appropriate live titles (≈ 12 PG pages, 4 PG-13, 8 TV)
    absorb(await homeBatch(12, 4, 8));
    return CATALOG;
  }

  // page in more appropriate home titles ("See more")
  let loadingMore = false;
  async function loadMore() {
    if (loadingMore || cursor.pg >= 400) return [];
    loadingMore = true;
    try {
      return absorb(await homeBatch(5, 2, 3));
    } finally { loadingMore = false; }
  }

  /* ---- rating-bounded pool for the quiz -------------------
     cap 1 = family (only G/PG movies + Family/Kids TV),
     cap 2 = up to PG-13, cap 3 = up to R. Returns titles that
     are GUARANTEED within the cap, so "family-friendly" can
     never surface PG-13+. */
  const CERT_FOR_CAP = { 1: 'PG', 2: 'PG-13', 3: 'R' };
  async function loadRatedPool(cap, genreIds) {
    const certLte = CERT_FOR_CAP[cap] || 'R';
    const movieExtra = { ...US, 'certification.lte': certLte };
    // TV can't filter by certification; for family, restrict to Family/Kids genres
    const tvExtra = cap === 1 ? { with_genres: '10751,10762' } : { without_genres: '10763,10767,10764' };
    // narrow to the chosen genres (OR), so the picks really pinpoint
    const picks = (genreIds || []).filter((id) => id != null);
    let fetchTv = true;
    if (picks.length) {
      movieExtra.with_genres = picks.join('|');
      const tvIds = [...new Set(picks.map((id) => MOVIE_TO_TV[id]).filter((x) => x != null))];
      if (tvIds.length) tvExtra.with_genres = tvIds.join('|');
      else fetchTv = false;                       // chosen genres have no TV form → movies only
    }
    const [movies, tv] = await Promise.all([
      discover('/discover/movie', 'Movie', 1, 7, movieExtra),
      fetchTv ? discover('/discover/tv', 'Series', 1, 4, tvExtra) : Promise.resolve([]),
    ]);
    movies.forEach((m) => { m._capSafe = cap; });  // guaranteed ≤ cap by the cert filter
    tv.forEach((m) => { m._capSafe = cap; });
    const pool = interleave(movies, tv);
    absorb(pool);            // so byId()/modal can resolve them
    return pool;
  }

  /* ---- lazy detail enrichment (modal) --------------------- */
  function usCert(item) {
    if (item.kind === 'Movie') {
      const us = (item.release_dates && item.release_dates.results || []).find((r) => r.iso_3166_1 === 'US');
      const cert = us && us.release_dates.map((d) => d.certification).find(Boolean);
      return cert || 'NR';
    }
    const us = (item.content_ratings && item.content_ratings.results || []).find((r) => r.iso_3166_1 === 'US');
    return (us && us.rating) || 'NR';
  }

  async function enrich(m) {
    if (m._enriched) return m;
    const path = m.kind === 'Movie' ? `/movie/${m.tmdbId}` : `/tv/${m.tmdbId}`;
    const base = m.kind === 'Movie' ? 'credits,release_dates' : 'credits,content_ratings,external_ids';
    const append = base + ',watch/providers';
    try {
      const d = await fetch(url(path, { append_to_response: append })).then((r) => r.json());
      m.rating = usCert(d);
      // 🍿 audience score (TMDB's own user rating, 0–10 → %)
      if (d.vote_average && d.vote_count) {
        m.audience = Math.round(d.vote_average * 10);
        m.audienceVotes = d.vote_count;
      }
      // 🍅 Rotten Tomatoes Tomatometer (critics) — only if an OMDb key is set
      const imdbId = d.imdb_id || (d.external_ids && d.external_ids.imdb_id);
      if (OMDB_KEY && imdbId) {
        try {
          const o = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}&tomatoes=true`).then((r) => r.json());
          const rt = (o.Ratings || []).find((x) => x.Source === 'Rotten Tomatoes');
          if (rt) m.tomato = parseInt(rt.Value, 10);
        } catch (e) { /* no RT */ }
      }
      // where to watch (US): streaming first, then free/ads, then rent/buy
      const wp = (d['watch/providers'] && d['watch/providers'].results || {}).US;
      if (wp) {
        const names = (list) => (list || []).map((p) => p.provider_name);
        const stream = [...new Set([...names(wp.flatrate), ...names(wp.free), ...names(wp.ads)])];
        m.providers = stream.slice(0, 4);
        m.watchKind = stream.length ? 'Streaming on' : ((wp.rent || wp.buy) ? 'Available to rent/buy' : '');
        m.watchLink = wp.link || '';
      }
      m.cast = (d.credits && d.credits.cast || []).slice(0, 3).map((c) => c.name);
      if (m.kind === 'Movie') {
        if (d.runtime) m.runtime = `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`;
        const dir = (d.credits && d.credits.crew || []).find((c) => c.job === 'Director');
        if (dir) m.by = dir.name;
      } else {
        if (d.number_of_seasons) m.seasons = d.number_of_seasons;
        m.by = (d.created_by || []).map((c) => c.name).join(', ') || (d.networks && d.networks[0] && d.networks[0].name) || '';
      }
      if (d.overview) m.overview = d.overview;
    } catch (e) { /* leave defaults */ }
    m._enriched = true;
    return m;
  }

  /* ---- live search: by title OR by actor/actress ---------- */
  const asKind = (mt) => (mt === 'tv' ? 'Series' : mt === 'movie' ? 'Movie' : null);
  async function search(query) {
    if (!query.trim()) return [];
    try {
      const d = await fetch(url('/search/multi', { query, include_adult: 'false' })).then((r) => r.json());
      const out = [];
      const people = [];
      (d.results || []).forEach((raw) => {
        if (raw.media_type === 'person') { people.push(raw); return; }
        const kind = asKind(raw.media_type);
        if (!kind) return;
        const it = toItem(raw, kind);
        if (it) out.push(it);
      });
      // for matched people (actors/actresses), pull their filmography
      for (const p of people.slice(0, 2)) {
        const c = await fetch(url(`/person/${p.id}/combined_credits`)).then((r) => r.json()).catch(() => null);
        (c && c.cast || []).forEach((raw) => {
          const kind = asKind(raw.media_type);
          if (!kind) return;
          const it = toItem(raw, kind);
          if (it) out.push(it);
        });
      }
      // dedupe, then most popular first
      const uniq = new Map();
      out.forEach((it) => { if (!uniq.has(it.id)) uniq.set(it.id, it); });
      const results = [...uniq.values()].sort((a, b) => b.popularity - a.popularity);
      absorb(results);       // fold finds into CATALOG so byId()/modal can resolve them
      return results;
    } catch (e) { return []; }
  }

  window.SynaiTMDB = { loadCatalog, loadMore, loadRatedPool, enrich, search, isHomeSafe, genreToDims };

  /* ---- big white squiggles across the background ----------
     Each is a full-width wavy line. They're laid into evenly
     spaced vertical bands (with a little jitter) so two
     squiggles can never overlap, and each gets a random wave
     shape so the order looks different every load. */
  function addSquiggles(scene) {
    if (!scene || scene.querySelector('.squiggle')) return;
    const W = 1200;                         // viewBox width (stretched to full width)
    const N = Math.max(5, Math.round(window.innerHeight / 150));
    const band = window.innerHeight / N;
    for (let i = 0; i < N; i++) {
      const h = Math.min(band * 0.7, 130);  // box height < band → bands never collide
      const amp = h * 0.32;
      const mid = h / 2;
      const top = band * i + (band - h) * (0.25 + Math.random() * 0.5);
      const humps = 3 + Math.floor(Math.random() * 4);
      const phase = Math.random() * Math.PI * 2;
      let d = '';
      const steps = 64;
      for (let s = 0; s <= steps; s++) {
        const x = (W * s) / steps;
        const y = mid + amp * Math.sin(phase + (humps * 2 * Math.PI * s) / steps);
        d += (s === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      const el = document.createElement('div');
      el.className = 'squiggle';
      el.style.cssText = `position:absolute;left:0;right:0;top:${top.toFixed(0)}px;height:${h.toFixed(0)}px;`;
      el.innerHTML =
        `<svg width="100%" height="100%" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none">` +
        `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" ` +
        `vector-effect="non-scaling-stroke" opacity="0.1"/></svg>`;
      scene.appendChild(el);
    }
  }

  /* ---- bootstrap: load, then start whichever page we're on  */
  function showLoading() {
    const grid = document.getElementById('poster-grid');
    if (grid) grid.innerHTML = '<p class="catalog-loading">Loading thousands of titles…</p>';
    const card = document.getElementById('q-prompt');
    if (card) card.textContent = 'Tuning the catalog…';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    addSquiggles(document.querySelector('.scene'));
    showLoading();
    await loadCatalog();
    if (typeof window.SynaiHome === 'function') window.SynaiHome();
    if (typeof window.SynaiQuiz === 'function') window.SynaiQuiz();
  });
})();
