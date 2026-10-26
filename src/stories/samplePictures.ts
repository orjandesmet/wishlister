/**
 * Pictures for stories, inline so Storybook works offline. Drawn shapes standing in
 * for shop photos: a square one on white, and a wide one that doesn't fit the tile.
 */
const svg = (width: number, height: number, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;

export const bonsaiPicture = svg(
  100,
  100,
  `<rect width="100" height="100" fill="#fff"/>
  <rect x="30" y="72" width="40" height="14" rx="3" fill="#8a5a3b"/>
  <path d="M50 72 V52 M50 60 L62 50" stroke="#6b4429" stroke-width="5" fill="none"/>
  <circle cx="40" cy="42" r="16" fill="#3f8f4f"/>
  <circle cx="60" cy="38" r="18" fill="#4fa860"/>
  <circle cx="66" cy="50" r="10" fill="#3f8f4f"/>`,
);

export const scarfPicture = svg(
  200,
  80,
  `<rect width="200" height="80" fill="#fff"/>
  <rect x="10" y="25" width="180" height="30" rx="8" fill="#8d939a"/>
  <path d="M30 25 V55 M60 25 V55 M90 25 V55 M120 25 V55 M150 25 V55" stroke="#a9aeb4" stroke-width="6"/>`,
);

/** Never loads: a picture that moved, or a shop that blocks it. */
export const brokenPicture = "https://picture.invalid/gone.jpg";

/** A red bike, for an item with several pictures. */
export const bikePicture = svg(
  120,
  80,
  `<rect width="120" height="80" fill="#fff"/>
  <circle cx="30" cy="52" r="18" fill="none" stroke="#2b2b2b" stroke-width="5"/>
  <circle cx="90" cy="52" r="18" fill="none" stroke="#2b2b2b" stroke-width="5"/>
  <path d="M30 52 L50 26 L78 26 L90 52 M50 26 L62 52 L78 26" stroke="#c0392b" stroke-width="5" fill="none"/>`,
);

/** The bike's bell, close up. */
export const bellPicture = svg(
  100,
  100,
  `<rect width="100" height="100" fill="#fff"/>
  <circle cx="50" cy="55" r="28" fill="#d4ac0d"/>
  <rect x="44" y="20" width="12" height="10" rx="3" fill="#7f6a0b"/>`,
);

/** A blue helmet that goes with the bike. */
export const helmetPicture = svg(
  100,
  100,
  `<rect width="100" height="100" fill="#fff"/>
  <path d="M15 65 A35 35 0 0 1 85 65 Z" fill="#2e6fb5"/>
  <rect x="15" y="63" width="70" height="8" rx="4" fill="#1d4f86"/>`,
);
