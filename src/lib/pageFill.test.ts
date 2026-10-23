import { describe, expect, it } from "vite-plus/test";
import { fillFromPage, lookupUrl } from "./pageFill.ts";

const page = { title: "LEGO Bonsai", image: "https://shop.example/bonsai.jpg", price: null };
const empty = { name: "", price: "", currency: "EUR" };

describe("lookupUrl", () => {
  it("accepts full web links", () => {
    expect(lookupUrl(" https://shop.example/p/1 ")).toBe("https://shop.example/p/1");
  });

  it("skips links that are still being typed or aren't web links", () => {
    expect(lookupUrl("https://")).toBeNull();
    expect(lookupUrl("https://lego")).toBeNull();
    expect(lookupUrl("shop.example")).toBeNull();
    expect(lookupUrl("mailto:me@example.com")).toBeNull();
  });
});

describe("fillFromPage", () => {
  it("fills an empty name", () => {
    expect(fillFromPage(empty, page, null, "en")).toEqual({ name: "LEGO Bonsai" });
    expect(fillFromPage({ ...empty, name: "  " }, page, null, "en")).toEqual({
      name: "LEGO Bonsai",
    });
  });

  it("keeps a name that was typed", () => {
    expect(fillFromPage({ ...empty, name: "Bonsai tree" }, page, null, "en")).toEqual({});
  });

  it("fills an empty price in the language's format", () => {
    const priced = { ...page, title: null, price: { amount: 49.99, currency: "USD" } };
    expect(fillFromPage(empty, priced, null, "nl")).toEqual({ price: "49,99", currency: "USD" });
    expect(fillFromPage(empty, priced, null, "en")).toEqual({ price: "49.99", currency: "USD" });
  });

  it("replaces a price an earlier lookup filled in, but not a typed one", () => {
    const priced = { ...page, title: null, price: { amount: 20, currency: "EUR" } };
    expect(fillFromPage({ ...empty, price: "49.99" }, priced, "49.99", "en")).toEqual({
      price: "20",
      currency: "EUR",
    });
    expect(fillFromPage({ ...empty, price: "15" }, priced, "49.99", "en")).toEqual({});
  });

  it("changes nothing for a page that couldn't be read", () => {
    expect(fillFromPage(empty, { title: null, image: null, price: null }, null, "en")).toEqual({});
  });
});
