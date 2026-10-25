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
