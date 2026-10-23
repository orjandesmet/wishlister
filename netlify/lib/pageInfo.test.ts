import { describe, expect, it, vi } from "vite-plus/test";
import {
  fetchMicrolink,
  fetchPageInfo,
  isBlockingSite,
  isFetchableUrl,
  isSiteName,
  lookUpPage,
  parsePageInfo,
  toPrice,
} from "./pageInfo.ts";

describe("isFetchableUrl", () => {
  it("accepts public http(s) pages", () => {
    expect(isFetchableUrl("https://www.bol.com/nl/p/lego/123/")).toBe(true);
    expect(isFetchableUrl("http://example.com")).toBe(true);
  });

  it("refuses other schemes and internal addresses", () => {
    for (const url of [
      "ftp://example.com",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "http://localhost:8888",
      "http://127.0.0.1",
      "http://10.0.0.5",
      "http://172.20.1.1",
      "http://192.168.1.1",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "http://user:pass@example.com",
      "not a url",
    ]) {
      expect(isFetchableUrl(url), url).toBe(false);
    }
  });
});

describe("parsePageInfo", () => {
  it("prefers Open Graph tags and resolves a relative image", () => {
    const html = `<html><head>
      <title>LEGO 10305 | Shop</title>
      <meta content="LEGO Icons Lion Knights' Castle" property="og:title">
      <meta property="og:image" content="/img/castle.jpg" />
    </head></html>`;
    expect(parsePageInfo(html, "https://shop.example/p/10305")).toEqual({
      title: "LEGO Icons Lion Knights' Castle",
      image: "https://shop.example/img/castle.jpg",
      price: null,
    });
  });

  it("falls back to twitter tags, then the title tag", () => {
    expect(
      parsePageInfo(
        `<meta name="twitter:title" content="A book"><meta name="twitter:image" content="https://cdn.example/b.png">`,
        "https://example.com",
      ),
    ).toEqual({ title: "A book", image: "https://cdn.example/b.png", price: null });
    expect(parsePageInfo("<title>\n  Plain   title\n</title>", "https://example.com")).toEqual({
      title: "Plain title",
      image: null,
      price: null,
    });
  });

  it("decodes entities and cuts very long titles", () => {
    expect(
      parsePageInfo("<title>Tom &amp; Jerry &#8211; DVD</title>", "https://x.example").title,
    ).toBe("Tom & Jerry – DVD");
    const long = parsePageInfo(`<title>${"a".repeat(300)}</title>`, "https://x.example").title!;
    expect(long).toHaveLength(150);
    expect(long.endsWith("…")).toBe(true);
  });

  it("uses a JSON-LD product name before the title tag", () => {
    const html = `<title>Shop | Home</title><script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"Product","name":"Race car"}]}
    </script>`;
    expect(parsePageInfo(html, "https://x.example").title).toBe("Race car");
  });

  it("reads the price from product meta tags", () => {
    const html = `<meta property="og:title" content="Bonsai">
      <meta property="product:price:amount" content="49.99">
      <meta property="product:price:currency" content="eur">`;
    expect(parsePageInfo(html, "https://x.example").price).toEqual({
      amount: 49.99,
      currency: "EUR",
    });
  });

  it("reads the price from a JSON-LD offer", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Product","name":"Race car","offers":[{"@type":"Offer","price":"1.299,00","priceCurrency":"EUR"}]}
    </script>`;
    expect(parsePageInfo(html, "https://x.example")).toEqual({
      title: "Race car",
      image: null,
      price: { amount: 1299, currency: "EUR" },
    });
    const aggregate = `<script type="application/ld+json">
      {"@type":"Product","name":"Book","offers":{"@type":"AggregateOffer","lowPrice":12.5,"priceCurrency":"USD"}}
    </script>`;
    expect(parsePageInfo(aggregate, "https://x.example").price).toEqual({
      amount: 12.5,
      currency: "USD",
    });
  });

  it("reads microdata price tags", () => {
    const html = `<meta itemprop="price" content="19,95"><meta itemprop="priceCurrency" content="GBP">`;
    expect(parsePageInfo(html, "https://x.example").price).toEqual({
      amount: 19.95,
      currency: "GBP",
    });
  });

  it("takes the name from the head, not from titles in the body", () => {
    const html = `<html><head><title>LEGO BMW M3 | bol</title></head>
      <body><svg><title>bol</title></svg><meta property="og:title" content="Other"></body></html>`;
    expect(parsePageInfo(html, "https://www.bol.com/x").title).toBe("LEGO BMW M3 | bol");
    // Without a title in the head, a body <title> doesn't count either.
    expect(
      parsePageInfo("<head></head><body><svg><title>bol</title></svg></body>", "https://x.example")
        .title,
    ).toBeNull();
  });

  it("gives nulls when the page has neither", () => {
    expect(parsePageInfo("<p>hi</p>", "https://x.example")).toEqual({
      title: null,
      image: null,
      price: null,
    });
  });
});

describe("isSiteName", () => {
  it("spots titles that are only the site's name", () => {
    expect(isSiteName("bol", "https://www.bol.com/be/nl/p/x/1/")).toBe(true);
    expect(isSiteName("Bol.com", "https://www.bol.com/x")).toBe(true);
    expect(isSiteName("LEGO", "https://www.lego.com/nl-be/product/x")).toBe(true);
    expect(isSiteName("Xiaomi stofzuiger | bol", "https://www.bol.com/x")).toBe(false);
  });
});

describe("toPrice", () => {
  it("reads the ways shops write amounts", () => {
    expect(toPrice("19.99", "EUR")).toEqual({ amount: 19.99, currency: "EUR" });
    expect(toPrice("€ 1,299.00", "EUR")?.amount).toBe(1299);
    expect(toPrice("1.299", "EUR")?.amount).toBe(1299);
    expect(toPrice(7, "usd")).toEqual({ amount: 7, currency: "USD" });
  });

  it("skips prices without a currency, zero or junk", () => {
    expect(toPrice("19.99", undefined)).toBeNull();
    expect(toPrice("19.99", "€")).toBeNull();
    expect(toPrice("0.00", "EUR")).toBeNull();
    expect(toPrice("free", "EUR")).toBeNull();
    expect(toPrice({}, "EUR")).toBeNull();
  });
});

describe("fetchPageInfo", () => {
  const html = (body: string, status = 200) =>
    new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

  it("reads on past the head for a price in the body", async () => {
    // Like bol.com: Open Graph tags in the head, JSON-LD product data in the body.
    const chunks = [
      `<html><head><meta property="og:title" content="LEGO BMW M3"></head>`,
      `<body><script type="application/ld+json">{"@type":"Product","name":"LEGO BMW M3",
        "offers":{"@type":"Offer","price":179.99,"priceCurrency":"EUR"}}</script></body></html>`,
    ];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    const fetch = async () =>
      new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
    expect(await fetchPageInfo("https://www.bol.com/nl/nl/p/x/1/", fetch)).toEqual({
      title: "LEGO BMW M3",
      image: null,
      price: { amount: 179.99, currency: "EUR" },
    });
  });

  it("takes a link to a picture as the picture", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
      url === "https://cdn.example/i/123"
        ? new Response(null, {
            status: 302,
            headers: { location: "https://cdn.example/i/123.webp" },
          })
        : new Response("not really an image", { headers: { "content-type": "image/webp" } }),
    );
    expect(await fetchPageInfo("https://cdn.example/i/123", fetch)).toEqual({
      title: null,
      image: "https://cdn.example/i/123.webp",
      price: null,
      isImage: true,
    });
  });

  it("follows redirects and reads the final page", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
      url === "https://short.example/x"
        ? new Response(null, { status: 301, headers: { location: "https://shop.example/item" } })
        : html("<head><title>The item</title></head>"),
    );
    expect(await fetchPageInfo("https://short.example/x", fetch)).toEqual({
      title: "The item",
      image: null,
      price: null,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sends cookies back on a redirect to the same page", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) =>
      new Headers(init?.headers).get("cookie") === "locale=nl"
        ? html("<title>Hello</title>")
        : new Response(null, {
            status: 302,
            headers: { location: "/same", "set-cookie": "locale=nl; Path=/; Secure" },
          }),
    );
    expect((await fetchPageInfo("https://shop.example/same", fetch)).title).toBe("Hello");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("doesn't follow a redirect to an internal address", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }),
    );
    expect(await fetchPageInfo("https://evil.example", fetch)).toEqual({
      title: null,
      image: null,
      price: null,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives nulls for errors, non-HTML and network failures", async () => {
    expect(
      await fetchPageInfo("https://x.example", async () => html("<title>x</title>", 404)),
    ).toEqual({ title: null, image: null, price: null });
    expect(
      await fetchPageInfo("https://x.example", async () => Response.json({ title: "x" })),
    ).toEqual({ title: null, image: null, price: null });
    expect(
      await fetchPageInfo("https://x.example", async () => {
        throw new TypeError("network");
      }),
    ).toEqual({ title: null, image: null, price: null });
  });
});

describe("Microlink fallback", () => {
  const microlinkOk = Response.json({
    status: "success",
    data: { title: "Mercedes-AMG F1 W15", image: { url: "https://cdn.example/car.jpg" } },
  });

  it("asks Microlink when the shop blocks us", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
      new URL(url instanceof Request ? url.url : url).hostname.endsWith("microlink.io")
        ? microlinkOk.clone()
        : new Response("Access denied", { status: 403, headers: { "content-type": "text/html" } }),
    );
    expect(
      await lookUpPage("https://www.lego.com/nl-nl/product/x-77244", undefined, fetch),
    ).toEqual({
      title: "Mercedes-AMG F1 W15",
      image: "https://cdn.example/car.jpg",
      price: null,
    });
    const [endpoint] = fetch.mock.calls[1] as [URL];
    expect(endpoint.origin).toBe("https://api.microlink.io");
    expect(endpoint.searchParams.get("url")).toBe("https://www.lego.com/nl-nl/product/x-77244");
  });

  it("doesn't look up sites that block lookups", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    expect(await lookUpPage("https://www.bol.com/be/nl/p/x/930/", "key_1", fetch)).toEqual({
      title: null,
      image: null,
      price: null,
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(isBlockingSite("https://bol.com/x")).toBe(true);
    expect(isBlockingSite("https://www.symbol.com/x")).toBe(false);
  });

  it("treats a page titled with only the shop's name as nothing found", async () => {
    // Shops' block pages are often titled like this, e.g. bol.com's "bol".
    const block = () =>
      new Response("<head><title>Blokker</title></head>", {
        headers: { "content-type": "text/html" },
      });
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
      new URL(url instanceof Request ? url.url : url).hostname.endsWith("microlink.io")
        ? Response.json({
            status: "success",
            data: { title: "blokker.nl", html: "<title>blokker.nl</title>" },
          })
        : block(),
    );
    expect(await lookUpPage("https://www.blokker.nl/p/stofzuiger/930/", undefined, fetch)).toEqual({
      title: null,
      image: null,
      price: null,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("doesn't ask Microlink when the page itself has a title", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response("<title>Mine</title>", { headers: { "content-type": "text/html" } }),
    );
    expect((await lookUpPage("https://x.example", undefined, fetch)).title).toBe("Mine");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reads the price from the HTML Microlink returns", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        status: "success",
        data: {
          title: "Microlink's title",
          image: { url: "https://cdn.example/car.jpg" },
          html: `<head><meta property="og:title" content="F1 car"></head><body>
            <script type="application/ld+json">{"@type":"Product","name":"F1 car",
              "offers":{"@type":"Offer","price":"229.99","priceCurrency":"EUR"}}</script></body>`,
        },
      }),
    );
    expect(await fetchMicrolink("https://www.lego.com/x", undefined, fetch)).toEqual({
      title: "F1 car",
      image: "https://cdn.example/car.jpg",
      price: { amount: 229.99, currency: "EUR" },
    });
    const [endpoint] = fetch.mock.calls[0] as [URL];
    expect(endpoint.searchParams.get("data.html.attr")).toBe("html");
  });

  it("uses the Pro endpoint with an API key", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => microlinkOk.clone());
    await fetchMicrolink("https://x.example", "key_1", fetch);
    const [endpoint, init] = fetch.mock.calls[0] as [URL, RequestInit];
    expect(endpoint.origin).toBe("https://pro.microlink.io");
    expect(new Headers(init.headers).get("x-api-key")).toBe("key_1");
  });

  it("falls back to the free endpoint when the Pro one answers 429", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
      (url as URL).host === "pro.microlink.io"
        ? Response.json({ status: "fail", message: "Too Many Requests" }, { status: 429 })
        : microlinkOk.clone(),
    );
    expect((await fetchMicrolink("https://x.example", "key_1", fetch)).title).toBe(
      "Mercedes-AMG F1 W15",
    );
    const [free, init] = fetch.mock.calls[1] as [URL, RequestInit];
    expect(free.origin).toBe("https://api.microlink.io");
    expect(new Headers(init.headers).has("x-api-key")).toBe(false);
  });

  it("gives nulls when Microlink fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ status: "fail", message: "rate limit" }, { status: 429 }),
    );
    expect(await fetchMicrolink("https://x.example", undefined, fetch)).toEqual({
      title: null,
      image: null,
      price: null,
    });
  });
});
