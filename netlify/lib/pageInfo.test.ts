import { describe, expect, it, vi } from "vite-plus/test";
import {
  fetchMicrolink,
  fetchPageInfo,
  isFetchableUrl,
  lookUpPage,
  parsePageInfo,
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
    });
  });

  it("falls back to twitter tags, then the title tag", () => {
    expect(
      parsePageInfo(
        `<meta name="twitter:title" content="A book"><meta name="twitter:image" content="https://cdn.example/b.png">`,
        "https://example.com",
      ),
    ).toEqual({ title: "A book", image: "https://cdn.example/b.png" });
    expect(parsePageInfo("<title>\n  Plain   title\n</title>", "https://example.com")).toEqual({
      title: "Plain title",
      image: null,
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

  it("gives nulls when the page has neither", () => {
    expect(parsePageInfo("<p>hi</p>", "https://x.example")).toEqual({ title: null, image: null });
  });
});

describe("fetchPageInfo", () => {
  const html = (body: string, status = 200) =>
    new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

  it("follows redirects and reads the final page", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
      url === "https://short.example/x"
        ? new Response(null, { status: 301, headers: { location: "https://shop.example/item" } })
        : html("<head><title>The item</title></head>"),
    );
    expect(await fetchPageInfo("https://short.example/x", fetch)).toEqual({
      title: "The item",
      image: null,
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
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives nulls for errors, non-HTML and network failures", async () => {
    expect(
      await fetchPageInfo("https://x.example", async () => html("<title>x</title>", 404)),
    ).toEqual({ title: null, image: null });
    expect(
      await fetchPageInfo("https://x.example", async () => Response.json({ title: "x" })),
    ).toEqual({ title: null, image: null });
    expect(
      await fetchPageInfo("https://x.example", async () => {
        throw new TypeError("network");
      }),
    ).toEqual({ title: null, image: null });
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
    });
    const [endpoint] = fetch.mock.calls[1] as [URL];
    expect(endpoint.origin).toBe("https://api.microlink.io");
    expect(endpoint.searchParams.get("url")).toBe("https://www.lego.com/nl-nl/product/x-77244");
  });

  it("doesn't ask Microlink when the page itself has a title", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response("<title>Mine</title>", { headers: { "content-type": "text/html" } }),
    );
    expect((await lookUpPage("https://x.example", undefined, fetch)).title).toBe("Mine");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses the Pro endpoint with an API key", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => microlinkOk.clone());
    await fetchMicrolink("https://x.example", "key_1", fetch);
    const [endpoint, init] = fetch.mock.calls[0] as [URL, RequestInit];
    expect(endpoint.origin).toBe("https://pro.microlink.io");
    expect(new Headers(init.headers).get("x-api-key")).toBe("key_1");
  });

  it("gives nulls when Microlink fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ status: "fail", message: "rate limit" }, { status: 429 }),
    );
    expect(await fetchMicrolink("https://x.example", undefined, fetch)).toEqual({
      title: null,
      image: null,
    });
  });
});
