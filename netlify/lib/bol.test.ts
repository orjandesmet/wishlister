import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { clearBolCache, fetchBolProduct, parseBolLink, readProduct } from "./bol.ts";
import { lookUpPage } from "./pageInfo.ts";

// Trimmed from ReefAPI's playground answer for this book (2026-10-25).
const product = {
  product_id: "9300000179591316",
  title: "Wat vooraf ging",
  url: "https://www.bol.com/be/nl/p/wat-vooraf-ging/9300000179591316/",
  price: 32,
  currency: "EUR",
  ean: "9789492672810",
  images: ["https://media.s-bol.com/YAxKyB4AmZ8K/587mgVR/111x155.jpg"],
};

beforeEach(() => clearBolCache());

describe("parseBolLink", () => {
  it("reads the product id and the storefront", () => {
    expect(
      parseBolLink("https://www.bol.com/be/nl/p/wat-vooraf-ging/9300000179591316/?bltgh=x"),
    ).toEqual({ productId: "9300000179591316", market: "be-nl" });
    expect(parseBolLink("https://www.bol.com/nl/nl/p/x/9200000012345678/")).toEqual({
      productId: "9200000012345678",
      market: "nl-nl",
    });
    expect(parseBolLink("https://bol.com/be/fr/p/x/9300000179591316")?.market).toBe("be-fr");
  });

  it("leaves the market out for old links without a country", () => {
    expect(parseBolLink("https://www.bol.com/nl/p/x/9200000012345678/")).toEqual({
      productId: "9200000012345678",
      market: undefined,
    });
  });

  it("ignores other pages and other sites", () => {
    expect(parseBolLink("https://www.bol.com/be/nl/l/speelgoed/7934/")).toBeNull();
    expect(parseBolLink("https://www.bol.com/be/nl/p/no-id/")).toBeNull();
    expect(parseBolLink("https://www.symbol.com/be/nl/p/x/9300000179591316/")).toBeNull();
    expect(parseBolLink("not a url")).toBeNull();
  });
});

describe("readProduct", () => {
  it("reads the name, first picture and price", () => {
    expect(readProduct(product)).toEqual({
      title: "Wat vooraf ging",
      image: "https://media.s-bol.com/YAxKyB4AmZ8K/587mgVR/111x155.jpg",
      price: { amount: 32, currency: "EUR" },
    });
  });

  it("finds the product inside a wrapper", () => {
    expect(readProduct({ data: [product] }).title).toBe("Wat vooraf ging");
    expect(
      readProduct({ records: [{ ...product, images: [{ url: "https://m/x.jpg" }] }] }),
    ).toEqual({
      title: "Wat vooraf ging",
      image: "https://m/x.jpg",
      price: { amount: 32, currency: "EUR" },
    });
  });

  it("gives nulls for anything else", () => {
    expect(readProduct(null)).toEqual({ title: null, image: null, price: null });
    expect(readProduct({ error: "not found" })).toEqual({ title: null, image: null, price: null });
  });
});

describe("fetchBolProduct", () => {
  const link = { productId: "9300000179591316", market: "be-nl" };

  it("asks ReefAPI with the key and remembers the answer", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(product));
    const info = await fetchBolProduct(link, "reef_1", fetch);
    expect(info.title).toBe("Wat vooraf ging");
    const [endpoint, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("https://api.reefapi.com/bol/v1/product/detail");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "x-api-key": "reef_1" });
    expect(JSON.parse(init.body as string)).toEqual({
      product_id: "9300000179591316",
      market: "be-nl",
    });

    expect(await fetchBolProduct(link, "reef_1", fetch)).toEqual(info);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks again after a day", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(product));
    await fetchBolProduct(link, "reef_1", fetch, 0);
    await fetchBolProduct(link, "reef_1", fetch, 25 * 60 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does nothing without a key", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    expect(await fetchBolProduct(link, undefined, fetch)).toEqual({
      title: null,
      image: null,
      price: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("gives nulls and doesn't remember failures", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ message: "Out of credits" }, { status: 402 }),
    );
    expect(await fetchBolProduct(link, "reef_1", fetch)).toEqual({
      title: null,
      image: null,
      price: null,
    });
    const thrown = vi.fn<typeof globalThis.fetch>(async () => {
      throw new Error("timeout");
    });
    expect((await fetchBolProduct(link, "reef_1", thrown)).title).toBeNull();
    await fetchBolProduct(link, "reef_1", fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("lookUpPage with a bol.com link", () => {
  it("goes to ReefAPI, not to the page or Microlink", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(product));
    expect(
      await lookUpPage(
        "https://www.bol.com/be/nl/p/wat-vooraf-ging/9300000179591316/",
        { microlink: "ml_1", reefapi: "reef_1" },
        fetch,
      ),
    ).toEqual(readProduct(product));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain("api.reefapi.com");
  });
});
