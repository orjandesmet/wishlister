// Reads a shop or article page and finds its name and picture, for quick add:
// paste a link and the item gets the page's title instead of the bare URL.
//
// Netlify functions import it as "../lib/pageInfo.ts". Plain functions with an
// injectable fetch, so they can be tested without the network.

export type PageInfo = { title: string | null; image: string | null };

/** Stop reading the page after this much: the <head> comes first anyway. */
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 6000;
/** Longer titles are cut, so a name still fits on a card. */
const MAX_TITLE = 150;

/**
 * Only public http(s) pages: the function shouldn't become a way to reach
 * addresses inside Netlify's network.
 */
export function isFetchableUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host.endsWith(".internal")) return false;
  // IPv4 literals in private, loopback, link-local and "this network" ranges.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  // Any IPv6 literal: shops don't link to those, and it rules out ::1, fc00::/7…
  if (host.includes(":")) return false;
  return true;
}

/** Finds the title and picture in a page's HTML, preferring Open Graph tags. */
export function parsePageInfo(html: string, pageUrl: string): PageInfo {
  const meta = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    if (key && attrs.content !== undefined && !meta.has(key)) meta.set(key, attrs.content);
  }
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = [meta.get("og:title"), meta.get("twitter:title"), titleTag]
    .map((value) => (value === undefined ? "" : cleanText(value)))
    .find((value) => value.length > 0);
  const image = [meta.get("og:image:secure_url"), meta.get("og:image"), meta.get("twitter:image")]
    .map((value) => (value ? absoluteHttpUrl(decodeEntities(value.trim()), pageUrl) : null))
    .find((value) => value !== null);
  return { title: title ? truncate(title, MAX_TITLE) : null, image: image ?? null };
}

/**
 * Fetches the page (following redirects only to public addresses) and reads its
 * title and picture. Never throws: a page that can't be read gives nulls.
 */
export async function fetchPageInfo(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PageInfo> {
  const empty: PageInfo = { title: null, image: null };
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    let url = rawUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isFetchableUrl(url)) return empty;
      const response = await fetchImpl(url, {
        redirect: "manual",
        signal,
        headers: {
          // Some shops only answer browsers.
          "User-Agent":
            "Mozilla/5.0 (compatible; Wishlister/1.0; +https://github.com/orjandesmet/wishlister)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "nl,en;q=0.8",
        },
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel();
        url = new URL(location, url).href;
        continue;
      }
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !/html/i.test(type)) {
        await response.body?.cancel();
        return empty;
      }
      return parsePageInfo(await readStart(response, type), url);
    }
    return empty;
  } catch {
    return empty;
  }
}

/** Reads at most MAX_BYTES of the body, decoded with the page's charset. */
async function readStart(response: Response, contentType: string): Promise<string> {
  const charset = contentType.match(/charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  let text = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
    // The head is all we need.
    if (/<\/head>/i.test(text)) break;
  }
  await reader.cancel();
  return text;
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
  }
  return attrs;
}

function cleanText(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  euro: "€",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const point =
        code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function absoluteHttpUrl(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
