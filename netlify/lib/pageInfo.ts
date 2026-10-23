// Reads a shop or article page and finds its name, picture and price, for quick
// add: paste a link and the item gets the page's title instead of the bare URL.
//
// Netlify functions import it as "../lib/pageInfo.ts". Plain functions with an
// injectable fetch, so they can be tested without the network.

/** An amount in a currency, as an ISO 4217 code ("EUR"). */
export type Price = { amount: number; currency: string };

export type PageInfo = { title: string | null; image: string | null; price: Price | null };

/** Stop reading the page after this much: some shops put megabytes of inline CSS in the <head>. */
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 8;
const TIMEOUT_MS = 4000;
/** Both together stay under the 9.5s the app waits (and Netlify's 10s limit). */
const MICROLINK_TIMEOUT_MS = 3500;
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

/** Finds the title, picture and price in a page's HTML, preferring Open Graph tags. */
export function parsePageInfo(html: string, pageUrl: string): PageInfo {
  const meta = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase();
    if (key && attrs.content !== undefined && !meta.has(key)) meta.set(key, attrs.content);
  }
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const product = findProductData(html);
  const title = [meta.get("og:title"), meta.get("twitter:title"), product?.name, titleTag]
    .map((value) => (value === undefined ? "" : cleanText(value)))
    .find((value) => value.length > 0);
  const image = [meta.get("og:image:secure_url"), meta.get("og:image"), meta.get("twitter:image")]
    .map((value) => (value ? absoluteHttpUrl(decodeEntities(value.trim()), pageUrl) : null))
    .find((value) => value !== null);
  // Shops' own meta tags first (Facebook's product tags), then schema.org data:
  // JSON-LD, or microdata on <meta itemprop="price"> tags.
  const price =
    toPrice(meta.get("product:price:amount"), meta.get("product:price:currency")) ??
    toPrice(meta.get("og:price:amount"), meta.get("og:price:currency")) ??
    product?.price ??
    toPrice(meta.get("price"), meta.get("pricecurrency"));
  return { title: title ? truncate(title, MAX_TITLE) : null, image: image ?? null, price };
}

/**
 * Reads a price the way shops write it: 19.99, "19,99", "1.299,00", "€ 1,299.00".
 * Gives null for anything that isn't a positive amount in a known-looking currency.
 */
export function toPrice(amount: unknown, currency: unknown): Price | null {
  if (typeof currency !== "string" || !/^[a-z]{3}$/i.test(currency.trim())) return null;
  const value = parseAmount(amount);
  return value === null ? null : { amount: value, currency: currency.trim().toUpperCase() };
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  let text = raw.replace(/[^\d.,]/g, "");
  // The last separator is the decimal one when 1 or 2 digits follow it; any
  // other separators group thousands.
  const decimal = text.match(/[.,](\d{1,2})$/);
  const whole = decimal ? text.slice(0, -decimal[0].length) : text;
  text = whole.replace(/[.,]/g, "") + (decimal ? `.${decimal[1]}` : "");
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return value > 0 ? value : null;
}

/**
 * Reads the page ourselves first. Big shops behind bot protection (lego.com…)
 * refuse that, so then Microlink, which opens the page in a real browser, is
 * asked instead. Never throws.
 */
export async function lookUpPage(
  url: string,
  microlinkKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<PageInfo> {
  const direct = await fetchPageInfo(url, fetchImpl);
  if (direct.title) return direct;
  const microlink = await fetchMicrolink(url, microlinkKey, fetchImpl);
  return {
    title: microlink.title,
    image: direct.image ?? microlink.image,
    price: direct.price ?? microlink.price,
  };
}

/**
 * Asks Microlink (https://microlink.io) for the page's title and picture, plus
 * the page's HTML as its browser saw it (a custom "data" rule), which is read the
 * same way as a page we fetch ourselves: Microlink's own metadata has no price.
 * What's found in the HTML wins; Microlink's title and picture fill the gaps.
 * Without an API key it uses the free endpoint (50 links a day); with
 * MICROLINK_API_KEY it uses the Pro endpoint, and the free one when the Pro
 * endpoint refuses the key (429: the plan's quota is used up). Both share one
 * timeout, so the fallback doesn't make the app wait longer. Never throws.
 */
export async function fetchMicrolink(
  url: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
  signal: AbortSignal = AbortSignal.timeout(MICROLINK_TIMEOUT_MS),
): Promise<PageInfo> {
  const endpoint = new URL(apiKey ? "https://pro.microlink.io/" : "https://api.microlink.io/");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("data.html.selector", "html");
  endpoint.searchParams.set("data.html.attr", "html");
  // Shows in Netlify's function log, to check the key reaches the function.
  const via = `${endpoint.host}, ${apiKey ? "with MICROLINK_API_KEY" : "no MICROLINK_API_KEY"}`;
  console.log(`page-info: asking Microlink for ${url} (${via})`);
  try {
    const response = await fetchImpl(endpoint, {
      headers: apiKey ? { "x-api-key": apiKey } : {},
      signal,
    });
    const body = (await response.json().catch(() => null)) as {
      status?: string;
      message?: string;
      data?: { title?: unknown; image?: { url?: unknown } | null; html?: unknown };
    } | null;
    if (!response.ok || body?.status !== "success") {
      if (apiKey && response.status === 429) {
        console.log(`page-info: Microlink refused the key (429), trying the free endpoint`);
        return fetchMicrolink(url, undefined, fetchImpl, signal);
      }
      return failed(
        url,
        `microlink (${via}): ${response.status} ${body?.message ?? ""} ${quota(response)}`.trim(),
        url,
      );
    }
    const page =
      typeof body.data?.html === "string"
        ? parsePageInfo(body.data.html, url)
        : { title: null, image: null, price: null };
    const title = typeof body.data?.title === "string" ? cleanText(body.data.title) : "";
    const image = body.data?.image?.url;
    return {
      title: page.title ?? (title ? truncate(title, MAX_TITLE) : null),
      image: page.image ?? (typeof image === "string" ? absoluteHttpUrl(image, url) : null),
      price: page.price,
    };
  } catch (error) {
    return failed(url, `microlink (${via}): ${String(error)}`, url);
  }
}

/**
 * Fetches the page (following redirects only to public addresses) and reads its
 * title, picture and price. Never throws: a page that can't be read gives nulls.
 */
export async function fetchPageInfo(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PageInfo> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  // Many shops set a cookie (locale, consent) and redirect to the same page;
  // without sending it back they keep redirecting.
  const cookies = new Map<string, string>();
  try {
    let url = rawUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isFetchableUrl(url)) return failed(rawUrl, "not a public url", url);
      const response = await fetchImpl(url, {
        redirect: "manual",
        signal,
        headers: { ...BROWSER_HEADERS, ...cookieHeader(cookies) },
      });
      for (const cookie of response.headers.getSetCookie?.() ?? []) {
        const [pair] = cookie.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel();
        url = new URL(location, url).href;
        continue;
      }
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !/html/i.test(type)) {
        await response.body?.cancel();
        return failed(rawUrl, `status ${response.status}, ${type || "no content type"}`, url);
      }
      const info = parsePageInfo(await readStart(response, type, url), url);
      if (!info.title) failed(rawUrl, "no title found in the page", url);
      else if (!info.price) console.log(`page-info: no price found for ${rawUrl}`);
      return info;
    }
    return failed(rawUrl, "too many redirects", url);
  } catch (error) {
    return failed(rawUrl, String(error), rawUrl);
  }
}

// Shops behind bot protection often refuse anything that doesn't look like a browser.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "nl-BE,nl;q=0.9,en;q=0.8",
};

function cookieHeader(cookies: Map<string, string>): Record<string, string> {
  if (cookies.size === 0) return {};
  return { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") };
}

/**
 * Microlink's quota headers, e.g. "(quota 0/100 left, resets 2026-11-01T00:00:00.000Z)",
 * so a 429 shows whether the plan ran out and when it comes back.
 */
function quota(response: Response): string {
  const limit = response.headers.get("x-rate-limit-limit");
  const remaining = response.headers.get("x-rate-limit-remaining");
  const reset = Number(response.headers.get("x-rate-limit-reset"));
  if (limit === null && remaining === null) return "";
  const resets = reset > 0 ? `, resets ${new Date(reset * 1000).toISOString()}` : "";
  return `(quota ${remaining ?? "?"}/${limit ?? "?"} left${resets})`;
}

/** Logs why a page gave nothing (shows in Netlify's function log) and gives nulls. */
function failed(rawUrl: string, reason: string, finalUrl: string): PageInfo {
  console.log(`page-info: nothing found for ${rawUrl} (${reason}; last url ${finalUrl})`);
  return { title: null, image: null, price: null };
}

type ProductData = { name: string | undefined; price: Price | null };

/** The name and price of the first schema.org Product in the page's JSON-LD, if any. */
function findProductData(html: string): ProductData | undefined {
  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const product = findProduct(JSON.parse(match[1]));
      if (product) {
        return {
          name: typeof product.name === "string" ? product.name : undefined,
          price: offerPrice(product.offers),
        };
      }
    } catch {
      // Broken JSON-LD: try the next one.
    }
  }
  return undefined;
}

/** The price of a Product's offers: an Offer, an AggregateOffer (its lowest price) or a list. */
function offerPrice(offers: unknown): Price | null {
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const price = offerPrice(offer);
      if (price) return price;
    }
    return null;
  }
  if (!offers || typeof offers !== "object") return null;
  const offer = offers as Record<string, unknown>;
  const spec = (
    Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification
  ) as Record<string, unknown> | undefined;
  return (
    toPrice(offer.price, offer.priceCurrency) ??
    toPrice(offer.lowPrice, offer.priceCurrency) ??
    (spec && typeof spec === "object"
      ? toPrice(spec.price, spec.priceCurrency ?? offer.priceCurrency)
      : null) ??
    offerPrice(offer.offers)
  );
}

function findProduct(node: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProduct(child);
      if (found) return found;
    }
    return undefined;
  }
  if (!node || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  const type = record["@type"];
  const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
  if (isProduct && (typeof record.name === "string" || record.offers)) return record;
  return findProduct(record["@graph"]);
}

/**
 * Reads at most MAX_BYTES of the body, decoded with the page's charset. Stops at
 * </head> when the head already has a price; otherwise reads on, because many
 * shops (bol.com…) put their JSON-LD product data in the body.
 */
async function readStart(response: Response, contentType: string, url: string): Promise<string> {
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
  let headChecked = false;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (!headChecked && /<\/head>/i.test(text)) {
      headChecked = true;
      if (parsePageInfo(text, url).price) break;
    }
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
