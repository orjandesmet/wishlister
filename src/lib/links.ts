/**
 * Finds a link in what was typed or pasted into quick add, e.g.
 * "Lego castle https://shop.example/p/123" or just "https://shop.example/p/123".
 * Returns the link and whatever text is left as the name (empty when there's none).
 */
export function splitLink(text: string): { url: string | null; name: string } {
  const match = text.match(/\b(?:https?:\/\/|www\.)[^\s<>"]+/i);
  if (!match) return { url: null, name: text.trim() };
  // Trailing punctuation usually belongs to the sentence, not the link.
  const raw = match[0].replace(/[.,;:!?)\]]+$/, "");
  const withScheme = /^www\./i.test(raw) ? `https://${raw}` : raw;
  let url: string;
  try {
    url = new URL(withScheme).href;
  } catch {
    return { url: null, name: text.trim() };
  }
  const name = (text.slice(0, match.index) + text.slice(match.index! + raw.length))
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    // Separators left between the name and the link: "Lego castle - https://…".
    .replace(/^[\s\-–—:|,]+|[\s\-–—:|,]+$/g, "");
  return { url, name };
}

/**
 * A stand-in name for a link, until (or if) the page's title is found. Most shop
 * links end in a readable slug, e.g. ".../product/mercedes-amg-f1-w15-race-car-77244"
 * gives "Mercedes amg f1 w15 race car 77244"; otherwise the short link itself.
 */
export function linkLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const slug = pathname
      .split("/")
      .map((part) => decodeURIComponent(part).replace(/\.html?$/i, ""))
      .reverse()
      // Words joined by dashes or underscores, not an id like "9300000134968437" or "B0C1234XYZ".
      .find((part) => /[a-z].*[-_].*[a-z]/i.test(part) && part.split(/[-_]+/).length >= 2);
    if (slug) {
      const words = slug.split(/[-_]+/).filter(Boolean).join(" ");
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
    const label = (hostname.replace(/^www\./, "") + pathname).replace(/\/+$/, "");
    return label.length > 60 ? `${label.slice(0, 59)}…` : label;
  } catch {
    return url;
  }
}
