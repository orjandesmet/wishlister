// Looks up a pasted bol.com link through ReefAPI (https://reefapi.com), because
// bol.com blocks both our own lookup and Microlink (#72).
//
// POST /bol/v1/product/detail with the product id from the link costs 2 credits;
// the free plan has 1000. So: only with REEFAPI_API_KEY set, only for links with
// a product id, and each product is remembered for a day while the function
// stays warm. Failed calls cost nothing at ReefAPI.

import { toPrice, type PageInfo } from "./pageInfo.ts";

const ENDPOINT = "https://api.reefapi.com/bol/v1/product/detail";
/** ReefAPI answered in ~2s in a test; the app waits 9.5s for page-info. */
const TIMEOUT_MS = 7000;
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_SIZE = 200;
const MAX_TITLE = 150;

/** bol.com's storefronts, as the link's /<country>/<language>/ and ReefAPI's market. */
const MARKETS: Record<string, string> = {
  "nl/nl": "nl",
  "be/nl": "be",
  "be/fr": "be-fr",
  // Older links without a country are from the Dutch store.
  nl: "nl",
};

export type BolLink = { productId: string; market: string | undefined };

/**
 * The product id and storefront of a bol.com product link, e.g.
 * bol.com/be/nl/p/wat-vooraf-ging/9300000179591316/ → 9300000179591316 on market "be".
 * The slug doesn't matter; an unknown storefront leaves the market to ReefAPI's
 * default (be). Null for anything that isn't a product page.
 */
export function parseBolLink(raw: string): BolLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "bol.com" && !host.endsWith(".bol.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const p = parts.indexOf("p");
  if (p === -1) return null;
  const productId = parts.slice(p + 1).find((part) => /^\d{6,}$/.test(part));
  if (!productId) return null;
  const storefront = parts.slice(0, p).join("/").toLowerCase();
  return { productId, market: MARKETS[storefront] };
}

const cache = new Map<string, { info: PageInfo; at: number }>();

/** Forgets every remembered product (for tests). */
export function clearBolCache() {
  cache.clear();
}

/**
 * The name, first picture and price of a bol.com product. Without an API key,
 * or when ReefAPI fails or runs out of credits, gives nulls and the app keeps
 * the name it made from the link. Never throws.
 */
export async function fetchBolProduct(
  link: BolLink,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<PageInfo> {
  const none: PageInfo = { title: null, image: null, price: null };
  if (!apiKey) {
    console.log(`page-info: no REEFAPI_API_KEY, skipping bol.com product ${link.productId}`);
    return none;
  }
  const key = `${link.market ?? ""}:${link.productId}`;
  const cached = cache.get(key);
  if (cached && now - cached.at < CACHE_MS) return cached.info;

  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: link.productId,
        ...(link.market ? { market: link.market } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => null)) as unknown;
    console.log(
      `page-info: ReefAPI bol.com product ${link.productId} (${link.market ?? "default market"}): ` +
        `${response.status} ${credits(response)}`.trim(),
    );
    if (!response.ok) {
      console.log(`page-info: ReefAPI said ${JSON.stringify(body)?.slice(0, 300)}`);
      return none;
    }
    const info = readProduct(body);
    if (info.title) {
      if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
      cache.set(key, { info, at: now });
    }
    return info;
  } catch (error) {
    console.log(
      `page-info: ReefAPI failed for bol.com product ${link.productId}: ${String(error)}`,
    );
    return none;
  }
}

/**
 * Reads ReefAPI's answer, { ok, meta, data: { product } }: the title, the first
 * of `images` (`image` is usually null) and the price. Prices on bol.com are in euros.
 */
export function readProduct(body: unknown): PageInfo {
  const product = (body as { data?: { product?: unknown } } | null)?.data?.product;
  if (!product || typeof product !== "object") return { title: null, image: null, price: null };
  const { title, images, image, price, currency } = product as Record<string, unknown>;
  const name = typeof title === "string" ? title.replace(/\s+/g, " ").trim() : "";
  return {
    title: name ? truncate(name, MAX_TITLE) : null,
    image: firstImage(images) ?? firstImage([image]),
    price: toPrice(price, typeof currency === "string" && currency ? currency : "EUR"),
  };
}

/** The first http(s) picture in a list of URLs. */
function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const url = images.find((image) => typeof image === "string" && /^https?:\/\//i.test(image));
  return typeof url === "string" ? url : null;
}

/** Any credit or rate-limit headers, so Netlify's log shows how many credits are left. */
function credits(response: Response): string {
  const found = [...response.headers]
    .filter(([name]) => /credit|quota|rate-?limit/i.test(name))
    .map(([name, value]) => `${name}=${value}`);
  return found.length ? `(${found.join(", ")})` : "";
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
