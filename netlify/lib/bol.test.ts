import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { clearBolCache, fetchBolProduct, parseBolLink, readProduct } from "./bol.ts";
import { lookUpPage } from "./pageInfo.ts";

// Trimmed from a ReefAPI answer (2026-10-26).
const answer = {
  ok: true,
  meta: { api: "bol", endpoint: "product/detail", record_count: 1, cache_hit: false },
  data: {
    product: {
      product_id: "9300000166374057",
      title: "PlayStation 5 Disc Edition - Slim",
      url: "https://www.bol.com/be/nl/p/sony-playstation-5-bia-y/9300000166374057/",
      brand: { id: "606580693", name: "Sony PlayStation" },
      price: 759,
      currency: "EUR",
      image: null,
      ean: "0711719577171",
      images: [
        "https://media.s-bol.com/R7vApBR8W3jR/oDzmzX/1122x1200.jpg",
        "https://media.s-bol.com/4POv8pXvoNvx/n55oNo4/1200x998.jpg",
      ],
      video: "https://media.s-bol.com/xXwLQEK6l9Jz/4QK579x/550x309.jpg",
    },
  },
};

beforeEach(() => clearBolCache());

describe("parseBolLink", () => {
  it("reads the product id and the storefront", () => {
    expect(
      parseBolLink("https://www.bol.com/be/nl/p/wat-vooraf-ging/9300000179591316/?bltgh=x"),
    ).toEqual({ productId: "9300000179591316", market: "be" });
    expect(parseBolLink("https://www.bol.com/nl/nl/p/x/9200000012345678/")).toEqual({
      productId: "9200000012345678",
      market: "nl",
    });
    expect(parseBolLink("https://bol.com/be/fr/p/x/9300000179591316")?.market).toBe("be-fr");
  });

  it("reads old links without a country as the Dutch store", () => {
    expect(parseBolLink("https://www.bol.com/nl/p/x/9200000012345678/")?.market).toBe("nl");
  });

  it("leaves an unknown storefront to ReefAPI's default", () => {
    expect(parseBolLink("https://www.bol.com/de/de/p/x/9200000012345678/")).toEqual({
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
    expect(readProduct(answer)).toEqual({
      title: "PlayStation 5 Disc Edition - Slim",
      image: "https://media.s-bol.com/R7vApBR8W3jR/oDzmzX/1122x1200.jpg",
      price: { amount: 759, currency: "EUR" },
    });
  });

  it("uses image when there are no images", () => {
    const product = { ...answer.data.product, images: [], image: "https://media.s-bol.com/a.jpg" };
    expect(readProduct({ data: { product } }).image).toBe("https://media.s-bol.com/a.jpg");
  });

  it("gives nulls for anything else", () => {
    expect(readProduct(null)).toEqual({ title: null, image: null, price: null });
    expect(readProduct({ ok: false, error: "not found" })).toEqual({
      title: null,
      image: null,
      price: null,
    });
  });
});

describe("fetchBolProduct", () => {
  const link = { productId: "9300000179591316", market: "be" };

  it("asks ReefAPI with the key and remembers the answer", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(answer));
    const info = await fetchBolProduct(link, "reef_1", fetch);
    expect(info.title).toBe("PlayStation 5 Disc Edition - Slim");
    const [endpoint, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("https://api.reefapi.com/bol/v1/product/detail");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "x-api-key": "reef_1" });
    expect(JSON.parse(init.body as string)).toEqual({
      product_id: "9300000179591316",
      market: "be",
    });

    expect(await fetchBolProduct(link, "reef_1", fetch)).toEqual(info);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks again after a day", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(answer));
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
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(answer));
    expect(
      await lookUpPage(
        "https://www.bol.com/be/nl/p/wat-vooraf-ging/9300000179591316/",
        { microlink: "ml_1", reefapi: "reef_1" },
        fetch,
      ),
    ).toEqual(readProduct(answer));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain("api.reefapi.com");
  });
});
