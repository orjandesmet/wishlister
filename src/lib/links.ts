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

/** A short stand-in name for a link, until (or if) the page's title is found. */
export function linkLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const label = (hostname.replace(/^www\./, "") + pathname).replace(/\/+$/, "");
    return label.length > 60 ? `${label.slice(0, 59)}…` : label;
  } catch {
    return url;
  }
}
