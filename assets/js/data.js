/* ============================================================
   Synai — shared data
   Real posters via the TMDB image CDN (no key needed to serve).
   Taste dimensions: action, drama, comedy, scifi, thriller,
   romance, fantasy, crime, mystery, animation
   ============================================================ */

const IMG = 'https://image.tmdb.org/t/p/w500';

const GENRE_LABEL = {
  action: 'Action', drama: 'Drama', comedy: 'Comedy', scifi: 'Sci-Fi',
  thriller: 'Thriller', romance: 'Romance', fantasy: 'Fantasy',
  crime: 'Crime', mystery: 'Mystery', animation: 'Animation',
};

/* id, title, year, kind, genre, poster path, taste tags */
const CATALOG = [
  { id: 'inception',    title: 'Inception',                 year: 2010, kind: 'Movie',  genre: 'scifi',     poster: '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg', tags: { scifi: 3, thriller: 2, action: 1 } },
  { id: 'dune',         title: 'Dune',                      year: 2021, kind: 'Movie',  genre: 'scifi',     poster: '/gDzOcq0pfeCeqMBwKIJlSmQpjkZ.jpg', tags: { scifi: 3, action: 2, drama: 1 } },
  { id: 'parasite',     title: 'Parasite',                  year: 2019, kind: 'Movie',  genre: 'thriller',  poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', tags: { thriller: 3, drama: 2, comedy: 1 } },
  { id: 'madmax',       title: 'Mad Max: Fury Road',        year: 2015, kind: 'Movie',  genre: 'action',    poster: '/hA2ple9q4qnwxp3hKVNhroipsir.jpg', tags: { action: 3, scifi: 1 } },
  { id: 'interstellar', title: 'Interstellar',              year: 2014, kind: 'Movie',  genre: 'scifi',     poster: '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg', tags: { scifi: 3, drama: 2 } },
  { id: 'eeaao',        title: 'Everything Everywhere',     year: 2022, kind: 'Movie',  genre: 'scifi',     poster: '/u68AjlvlutfEIcpmbYpKcdi09ut.jpg', tags: { scifi: 2, comedy: 2, drama: 2 } },
  { id: 'br2049',       title: 'Blade Runner 2049',         year: 2017, kind: 'Movie',  genre: 'scifi',     poster: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', tags: { scifi: 3, mystery: 2, drama: 1 } },
  { id: 'spiderverse',  title: 'Into the Spider-Verse',     year: 2018, kind: 'Movie',  genre: 'animation', poster: '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg', tags: { animation: 3, action: 2 } },
  { id: 'spirited',     title: 'Spirited Away',             year: 2001, kind: 'Movie',  genre: 'animation', poster: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', tags: { animation: 3, fantasy: 2 } },
  { id: 'darkknight',   title: 'The Dark Knight',           year: 2008, kind: 'Movie',  genre: 'action',    poster: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', tags: { action: 2, crime: 2, thriller: 2 } },
  { id: 'johnwick',     title: 'John Wick',                 year: 2014, kind: 'Movie',  genre: 'action',    poster: '/wXqWR7dHncNRbxoEGybEy7QTe9h.jpg', tags: { action: 3, thriller: 2 } },
  { id: 'lalaland',     title: 'La La Land',                year: 2016, kind: 'Movie',  genre: 'romance',   poster: '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg', tags: { romance: 3, drama: 1, comedy: 1 } },
  { id: 'knivesout',    title: 'Knives Out',                year: 2019, kind: 'Movie',  genre: 'mystery',   poster: '/pThyQovXQrw2m0s9x82twj48Jq4.jpg', tags: { mystery: 3, comedy: 2, crime: 1 } },
  { id: 'oppenheimer',  title: 'Oppenheimer',               year: 2023, kind: 'Movie',  genre: 'drama',     poster: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', tags: { drama: 3, thriller: 1 } },
  { id: 'whiplash',     title: 'Whiplash',                  year: 2014, kind: 'Movie',  genre: 'drama',     poster: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', tags: { drama: 3, thriller: 1 } },
  { id: 'getout',       title: 'Get Out',                   year: 2017, kind: 'Movie',  genre: 'thriller',  poster: '/mE24wUCfjK8AoBBjaMjho7Rczr7.jpg', tags: { thriller: 3, mystery: 1 } },
  { id: 'breakingbad',  title: 'Breaking Bad',              year: 2008, kind: 'Series', genre: 'crime',     poster: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg', tags: { crime: 3, drama: 2, thriller: 2 } },
  { id: 'strangerthings', title: 'Stranger Things',         year: 2016, kind: 'Series', genre: 'scifi',     poster: '/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg', tags: { scifi: 2, fantasy: 2, mystery: 1 } },
  { id: 'severance',    title: 'Severance',                 year: 2022, kind: 'Series', genre: 'scifi',     poster: '/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg', tags: { scifi: 3, mystery: 2, thriller: 1 } },
  { id: 'lastofus',     title: 'The Last of Us',            year: 2023, kind: 'Series', genre: 'drama',     poster: '/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg', tags: { drama: 2, thriller: 2, action: 2 } },
  { id: 'got',          title: 'Game of Thrones',           year: 2011, kind: 'Series', genre: 'fantasy',   poster: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', tags: { fantasy: 3, drama: 2, action: 1 } },
  { id: 'thebear',      title: 'The Bear',                  year: 2022, kind: 'Series', genre: 'drama',     poster: '/4fVddnbhcmzRZE14NJY03GKS6Fn.jpg', tags: { drama: 3, comedy: 1 } },
  { id: 'fleabag',      title: 'Fleabag',                   year: 2016, kind: 'Series', genre: 'comedy',    poster: '/27vEYsRKa3eAniwmoccOoluEXQ1.jpg', tags: { comedy: 3, drama: 2, romance: 1 } },
  { id: 'arcane',       title: 'Arcane',                    year: 2021, kind: 'Series', genre: 'animation', poster: '/abf8tHznhSvl9BAElD2cQeRr7do.jpg', tags: { animation: 3, fantasy: 2, action: 1 } },
];

const byId = (id) => CATALOG.find((m) => m.id === id);

/* 10 this-or-that matchups; choosing a title adds its taste tags. */
const MATCHUPS = [
  ['madmax', 'lalaland'],
  ['dune', 'got'],
  ['fleabag', 'oppenheimer'],
  ['getout', 'spirited'],
  ['breakingbad', 'knivesout'],
  ['spiderverse', 'darkknight'],
  ['br2049', 'thebear'],
  ['johnwick', 'parasite'],
  ['strangerthings', 'whiplash'],
  ['severance', 'eeaao'],
].map(([a, b]) => ({ a: byId(a), b: byId(b) }));
