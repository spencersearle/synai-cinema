/* ============================================================
   Synai — shared data & constants
   The CATALOG is now LIVE: it is fetched from the TMDB API at
   runtime (see tmdb.js). This file only holds the constants,
   the genre/mood vocabulary, and the hand-tuned quiz questions.
   Genre dimensions: action, drama, comedy, scifi, thriller,
   romance, fantasy, crime, mystery, animation
   Mood tags (the "in the moment" layer):
     cozy, feelgood, emotional, intense, mindbending, epic
   ============================================================ */

const IMG = 'https://image.tmdb.org/t/p/w500';

const GENRE_LABEL = {
  action: 'Action', drama: 'Drama', comedy: 'Comedy', scifi: 'Sci-Fi',
  thriller: 'Thriller', romance: 'Romance', fantasy: 'Fantasy',
  crime: 'Crime', mystery: 'Mystery', animation: 'Animation',
};

const MOOD_LABEL = {
  cozy: 'Cozy', feelgood: 'Feel-good', emotional: 'Emotional',
  intense: 'Intense', mindbending: 'Mind-bending', epic: 'Epic',
};

/* The live catalog. Each item (built in tmdb.js) has the shape:
   { id, title, year, kind, genre, rating, poster,
     tags(genre weights), moods(mood tags), overview,
     runtime|seasons, by, cast }   ← last line filled lazily   */
let CATALOG = [];

const byId = (id) => CATALOG.find((m) => String(m.id) === String(id));

/* ------------------------------------------------------------
   The quiz is assembled fresh every run (see quiz.js): a random
   handful of these in-the-moment "mood" questions, interleaved
   so the sampled questions differ each run.
   Each option carries genre weights (dims) and/or mood tags —
   every question is built to actually move the recommendation,
   not just set a vibe.
   ------------------------------------------------------------ */
const MOOD_POOL = [
  { kicker: 'The feeling', q: 'When the credits roll, how do you want to feel?', options: [
    { label: 'Warm & uplifted', sub: 'Leave me smiling', moods: ['feelgood', 'cozy'], dims: { comedy: 1 } },
    { label: 'Moved, maybe teary', sub: 'Break my heart a little', moods: ['emotional'], dims: { drama: 2 } },
    { label: 'Thrilled & buzzing', sub: 'Heart still racing', moods: ['intense', 'epic'], dims: { action: 2, thriller: 1 } },
    { label: 'Mind blown', sub: 'Make me question everything', moods: ['mindbending'], dims: { scifi: 1, mystery: 1 } },
  ] },
  { kicker: 'Tone', q: 'How light or heavy do you want it?', options: [
    { label: 'Light & fun', sub: 'Easy, breezy', moods: ['feelgood'], dims: { comedy: 2 } },
    { label: 'A real mix', sub: 'Funny but with weight', moods: ['emotional'], dims: { drama: 1, comedy: 1 } },
    { label: 'Heavy & serious', sub: 'Go deep', moods: ['emotional', 'intense'], dims: { drama: 3 } },
  ] },
  { kicker: 'Pace', q: 'Slow burn or full throttle?', options: [
    { label: 'Slow burn', sub: 'Let it build', moods: ['emotional', 'mindbending'], dims: { drama: 2, mystery: 1 } },
    { label: 'Steady & absorbing', sub: 'Pull me along', moods: ['emotional'], dims: { drama: 1 } },
    { label: 'Fast & relentless', sub: 'Never let up', moods: ['intense'], dims: { action: 2, thriller: 1 } },
  ] },
  { kicker: 'Brainpower', q: 'How much do you want to think?', options: [
    { label: 'Switch my brain off', sub: 'Pure comfort', moods: ['cozy', 'feelgood'] },
    { label: 'Just enough to follow', sub: 'In the middle', moods: [] },
    { label: 'Give me a real puzzle', sub: 'Make me work for it', moods: ['mindbending'], dims: { mystery: 2 } },
  ] },
  { kicker: 'The world', q: 'Real life or somewhere else entirely?', options: [
    { label: 'Grounded & real', sub: 'Could actually happen', dims: { drama: 2, crime: 1 } },
    { label: 'Heightened but believable', sub: 'Stylish, a step up', moods: ['intense'], dims: { thriller: 2, action: 1 } },
    { label: 'Pure imagination', sub: 'Magic, space, the impossible', moods: ['epic'], dims: { fantasy: 2, scifi: 2 } },
  ] },
  { kicker: 'What hooks you', q: 'What matters most to you in a story?', options: [
    { label: 'Characters I fall for', sub: 'People first', moods: ['emotional'], dims: { drama: 2, romance: 1 } },
    { label: 'A plot that surprises', sub: 'Keep me guessing', moods: ['mindbending'], dims: { mystery: 2, thriller: 1 } },
    { label: 'Spectacle & scale', sub: 'Show me something huge', moods: ['epic'], dims: { action: 2, scifi: 1 } },
    { label: 'Wit & great dialogue', sub: 'Smart and funny', moods: ['feelgood'], dims: { comedy: 2 } },
  ] },
  { kicker: 'Stakes', q: 'How big should it feel?', options: [
    { label: 'Intimate & personal', sub: 'One life, up close', moods: ['cozy', 'emotional'], dims: { drama: 2 } },
    { label: 'A tense, tangled web', sub: 'Out-think it', moods: ['mindbending', 'intense'], dims: { mystery: 2, crime: 1 } },
    { label: 'The whole world at risk', sub: 'Everything on the line', moods: ['epic'], dims: { action: 2, scifi: 1 } },
  ] },
  { kicker: 'The ending', q: 'How should it land?', options: [
    { label: 'Happy & satisfying', sub: 'Send me off smiling', moods: ['feelgood'] },
    { label: 'Open & thought-provoking', sub: 'Let me sit with it', moods: ['mindbending', 'emotional'] },
    { label: 'Gut-punch', sub: 'Wreck me a little', moods: ['intense'], dims: { drama: 1, thriller: 1 } },
  ] },
  { kicker: 'Familiar or new', q: 'Comfort watch or something fresh?', options: [
    { label: 'Cozy & familiar', sub: 'Like a warm hug', moods: ['cozy', 'feelgood'] },
    { label: 'Bold & surprising', sub: 'Show me something new', moods: ['mindbending', 'intense'] },
  ] },
  { kicker: 'Intensity', q: 'How high should your pulse get?', options: [
    { label: 'Keep me calm', sub: 'Gentle and easy', moods: ['cozy', 'feelgood'] },
    { label: 'A little tension', sub: 'Some edge', moods: ['emotional'], dims: { thriller: 1 } },
    { label: 'Edge of my seat', sub: 'White knuckles', moods: ['intense'], dims: { thriller: 2, action: 1 } },
  ] },
  { kicker: 'Style', q: 'Live-action or animated?', options: [
    { label: 'Live-action', sub: 'Real actors', moods: [] },
    { label: 'Animated', sub: 'Drawn or rendered worlds', dims: { animation: 3 }, moods: ['feelgood'] },
    { label: 'Either is great', sub: 'No preference', moods: [] },
  ] },
  { kicker: 'The company', q: 'Who’s watching with you?', options: [
    { label: 'Just me', sub: 'Solo wind-down', moods: ['cozy', 'emotional'] },
    { label: 'A date', sub: 'Something to feel together', moods: ['emotional'], dims: { romance: 2 } },
    { label: 'Friends or family', sub: 'Keep it fun for everyone', moods: ['feelgood'], dims: { comedy: 1 } },
  ] },
];

/* ------------------------------------------------------------
   CORE questions are asked EVERY run (not sampled). They pin
   down the things that matter most: how mature, what they're
   craving, and how recent. The rating option carries `maturity`
   (a ceiling, see quiz.js) and the era option carries `recency`.
   ------------------------------------------------------------ */
const CORE_QUESTIONS = [
  { kicker: 'Comfort zone', q: 'How mature should it get?', options: [
    { label: 'Keep it family-friendly', sub: 'G & PG only', maturity: 1, moods: ['feelgood', 'cozy'] },
    { label: 'Teens and up', sub: 'Up to PG-13 / TV-14', maturity: 2 },
    { label: 'Mature is fine', sub: 'R / TV-MA welcome', maturity: 3 },
    { label: 'Anything goes', sub: 'No limits', maturity: 9 },
  ] },
  { kicker: 'The craving', q: 'What are you really craving tonight?', options: [
    { label: 'Thrills & action', sub: 'Adrenaline', dims: { action: 3 }, moods: ['intense', 'epic'] },
    { label: 'Laughs', sub: 'Lighten me up', dims: { comedy: 3 }, moods: ['feelgood'] },
    { label: 'Big feelings', sub: 'Drama & romance', dims: { drama: 3, romance: 1 }, moods: ['emotional'] },
    { label: 'Other worlds', sub: 'Sci-fi & fantasy', dims: { scifi: 2, fantasy: 2 }, moods: ['epic', 'mindbending'] },
    { label: 'Mystery & crime', sub: 'A good puzzle', dims: { mystery: 2, crime: 2 }, moods: ['mindbending', 'intense'] },
  ] },
  { kicker: 'Movie or show', q: 'A movie or a show tonight?', options: [
    { label: 'A movie', sub: 'One and done', only: 'Movie' },
    { label: 'A show', sub: 'A series to dig into', only: 'Series' },
    { label: 'Either is great', sub: 'Surprise me' },
  ] },
  { kicker: 'Vintage', q: 'New releases or timeless?', options: [
    { label: 'Fresh & recent', sub: 'The last few years', recency: 2 },
    { label: 'Modern classics', sub: 'No strong preference', recency: 0 },
    { label: 'Timeless & older', sub: 'Before the 2000s', recency: -2 },
  ] },
];

/* ------------------------------------------------------------
   The full genre list (TMDB ids). Asked as a multi-select so
   the user can tap every genre they feel like in the moment —
   the picks narrow the live search pool for a precise match.
   ------------------------------------------------------------ */
const GENRE_PICKER = [
  { label: 'Action', id: 28 }, { label: 'Adventure', id: 12 }, { label: 'Animation', id: 16 },
  { label: 'Comedy', id: 35 }, { label: 'Crime', id: 80 }, { label: 'Documentary', id: 99 },
  { label: 'Drama', id: 18 }, { label: 'Family', id: 10751 }, { label: 'Fantasy', id: 14 },
  { label: 'History', id: 36 }, { label: 'Horror', id: 27 }, { label: 'Music', id: 10402 },
  { label: 'Mystery', id: 9648 }, { label: 'Romance', id: 10749 }, { label: 'Sci-Fi', id: 878 },
  { label: 'Thriller', id: 53 }, { label: 'War', id: 10752 }, { label: 'Western', id: 37 },
];
