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
   with random this-or-that poster matchups drawn from the whole
   catalog — so the questions are different each time.
   Each mood option carries genre weights (dims), mood tags,
   and/or a movie-vs-series lean (kind).
   ------------------------------------------------------------ */
const MOOD_POOL = [
  { kicker: 'Right now', q: 'How do you want to feel when it’s over?', options: [
    { label: 'Cozy & comforted', sub: 'Wrapped in a blanket', moods: ['cozy', 'feelgood'] },
    { label: 'Completely blown away', sub: 'Whoa.', moods: ['mindbending', 'epic'] },
    { label: 'Moved, maybe teary', sub: 'Hit me right here', moods: ['emotional'] },
    { label: 'Wired & on edge', sub: 'Grip the cushions', moods: ['intense'] },
  ] },
  { kicker: 'Headspace', q: 'How much brain power have you got tonight?', options: [
    { label: 'Running on empty', sub: 'Keep it easy', moods: ['cozy', 'feelgood'] },
    { label: 'Enough to follow a plot', sub: 'Somewhere in between', moods: [] },
    { label: 'Give me a puzzle', sub: 'Make me think', moods: ['mindbending'], dims: { mystery: 1 } },
  ] },
  { kicker: 'The room', q: 'Who’s watching tonight?', options: [
    { label: 'Just me', sub: 'Solo wind-down', moods: ['cozy'] },
    { label: 'Friends', sub: 'Keep it fun', moods: ['feelgood'], dims: { comedy: 1 } },
    { label: 'Date night', sub: 'Something to feel', moods: ['emotional'], dims: { romance: 2 } },
    { label: 'Big group', sub: 'Make it an event', moods: ['epic'], dims: { action: 1 } },
  ] },
  { kicker: 'Tempo', q: 'Pick your pace.', options: [
    { label: 'Slow & calm', sub: 'Let it breathe', moods: ['cozy'], dims: { drama: 1 } },
    { label: 'Steady & absorbing', sub: 'Pull me in', moods: ['emotional'], dims: { drama: 1 } },
    { label: 'Fast & loud', sub: 'Floor it', moods: ['intense'], dims: { action: 2 } },
  ] },
  { kicker: 'The vibe', q: 'Comfort or discovery?', options: [
    { label: 'A cozy, familiar vibe', sub: 'Warm and easy', moods: ['cozy', 'feelgood'] },
    { label: 'Something bold & new', sub: 'Surprise me', moods: ['mindbending', 'intense'] },
  ] },
  { kicker: 'The clock', q: 'How much time have you got?', options: [
    { label: 'A quick hit', sub: 'One and done', kind: 2 },
    { label: 'All night', sub: 'Let’s binge a series', kind: -2 },
    { label: 'Whatever’s great', sub: 'No rules', kind: 0 },
  ] },
  { kicker: 'Energy', q: 'How’s your energy right now?', options: [
    { label: 'Wiped out', sub: 'Barely moving', moods: ['cozy', 'feelgood'] },
    { label: 'Cruising', sub: 'Comfortably awake', moods: ['emotional'], dims: { drama: 1 } },
    { label: 'Buzzing', sub: 'Ready to go', moods: ['intense'], dims: { action: 2 } },
  ] },
  { kicker: 'Weather of the mind', q: 'Pick tonight’s inner weather.', options: [
    { label: 'Warm & sunny', sub: 'Light and bright', moods: ['feelgood'], dims: { comedy: 1 } },
    { label: 'Cozy & rainy', sub: 'Soft and slow', moods: ['cozy', 'emotional'] },
    { label: 'Electric storm', sub: 'Charged up', moods: ['intense'], dims: { thriller: 1 } },
    { label: 'Foggy & strange', sub: 'Hard to read', moods: ['mindbending'], dims: { mystery: 1 } },
  ] },
  { kicker: 'The snack', q: 'Tonight’s snack says it all.', options: [
    { label: 'Comfort takeout', sub: 'The usual', moods: ['cozy', 'feelgood'] },
    { label: 'A proper dinner', sub: 'Make it nice', moods: ['emotional'], dims: { drama: 1 } },
    { label: 'Popcorn & soda', sub: 'Big screen energy', moods: ['epic'], dims: { action: 2 } },
    { label: 'Strong black coffee', sub: 'Stay sharp', moods: ['mindbending', 'intense'] },
  ] },
  { kicker: 'Lead with your…', q: 'Tonight you’re thinking with your…', options: [
    { label: 'Heart', sub: 'Feel everything', moods: ['emotional'], dims: { romance: 2 } },
    { label: 'Head', sub: 'Figure it out', moods: ['mindbending'], dims: { mystery: 1 } },
    { label: 'Gut', sub: 'Just react', moods: ['intense'], dims: { action: 1 } },
  ] },
  { kicker: 'Tonight you want to…', q: 'What are you really after?', options: [
    { label: 'Escape somewhere else', sub: 'Take me away', moods: ['epic'], dims: { fantasy: 2, scifi: 1 } },
    { label: 'Feel something real', sub: 'Ground me', moods: ['emotional'], dims: { drama: 2 } },
    { label: 'Just laugh it off', sub: 'Lighten up', moods: ['feelgood'], dims: { comedy: 2 } },
  ] },
  { kicker: 'The stakes', q: 'How big should the stakes feel?', options: [
    { label: 'Small & personal', sub: 'One life, up close', moods: ['cozy', 'emotional'], dims: { drama: 1 } },
    { label: 'Twisty & clever', sub: 'Out-think it', moods: ['mindbending'], dims: { mystery: 2 } },
    { label: 'The world on the line', sub: 'Everything at once', moods: ['epic'], dims: { action: 1, scifi: 1 } },
  ] },
  { kicker: 'The hook', q: 'What pulls you into a story?', options: [
    { label: 'Characters I love', sub: 'People first', moods: ['emotional'], dims: { drama: 2 } },
    { label: 'A twisty plot', sub: 'Keep me guessing', moods: ['mindbending'], dims: { mystery: 2, thriller: 1 } },
    { label: 'Jaw-dropping spectacle', sub: 'Show me something', moods: ['epic'], dims: { action: 2, scifi: 1 } },
    { label: 'Sharp, witty dialogue', sub: 'Smart & funny', moods: ['feelgood'], dims: { comedy: 2 } },
  ] },
  { kicker: 'How real?', q: 'Grounded or fantastical?', options: [
    { label: 'Keep it real', sub: 'Could actually happen', dims: { drama: 2, crime: 1 } },
    { label: 'A little heightened', sub: 'Stylish but believable', dims: { thriller: 1, action: 1 } },
    { label: 'Take me anywhere', sub: 'Magic & make-believe', moods: ['epic'], dims: { fantasy: 2, scifi: 2 } },
  ] },
  { kicker: 'The ending', q: 'How should it leave you?', options: [
    { label: 'Happy & resolved', sub: 'Tie it up neatly', moods: ['feelgood'] },
    { label: 'Thoughtful & open', sub: 'Let me sit with it', moods: ['mindbending', 'emotional'] },
    { label: 'Shaken', sub: 'A real gut punch', moods: ['intense'], dims: { thriller: 1 } },
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
  { kicker: 'Vintage', q: 'New releases or timeless?', options: [
    { label: 'Fresh & recent', sub: 'The last few years', recency: 2 },
    { label: 'Modern classics', sub: 'No strong preference', recency: 0 },
    { label: 'Timeless & older', sub: 'Before the 2000s', recency: -2 },
  ] },
];
