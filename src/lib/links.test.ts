import { describe, expect, it } from "vite-plus/test";
import { isImageLink, linkLabel, splitLink } from "./links.ts";

describe("splitLink", () => {
  it("leaves text without a link as the name", () => {
    expect(splitLink("  Socks ")).toEqual({ url: null, name: "Socks" });
  });

  it("takes a pasted link on its own", () => {
    expect(splitLink("https://shop.example/p/123?ref=x")).toEqual({
      url: "https://shop.example/p/123?ref=x",
      name: "",
    });
  });

  it("keeps the text around the link as the name", () => {
    expect(splitLink("Lego castle - https://shop.example/p/123")).toEqual({
      url: "https://shop.example/p/123",
      name: "Lego castle",
    });
    expect(splitLink("Look at https://shop.example/a, the blue one")).toEqual({
      url: "https://shop.example/a",
      name: "Look at, the blue one",
    });
    expect(splitLink("Blue sweater (https://shop.example/b)")).toEqual({
      url: "https://shop.example/b",
      name: "Blue sweater",
    });
  });

  it("adds https to a link starting with www.", () => {
    expect(splitLink("www.example.com/book")).toEqual({
      url: "https://www.example.com/book",
      name: "",
    });
  });
});

describe("linkLabel", () => {
  it("turns a readable slug into words", () => {
    expect(linkLabel("https://www.lego.com/nl-nl/product/mercedes-amg-f1-w15-race-car-77244")).toBe(
      "Mercedes amg f1 w15 race car 77244",
    );
    expect(
      linkLabel("https://www.bol.com/nl/nl/p/lego-icons-kasteel/9300000134968437/?bltgh=x"),
    ).toBe("Lego icons kasteel");
  });

  it("shows the site and path when there's no slug", () => {
    expect(linkLabel("https://www.bol.com/nl/p/lego/")).toBe("bol.com/nl/p/lego");
  });

  it("shortens long links", () => {
    const label = linkLabel(`https://example.com/${"a".repeat(100)}`);
    expect(label).toHaveLength(60);
    expect(label.endsWith("…")).toBe(true);
  });
});

describe("isImageLink", () => {
  it("spots links to pictures", () => {
    expect(isImageLink("https://cdn.example/photos/bike.JPG")).toBe(true);
    expect(isImageLink("https://cdn.example/a/b.webp?w=800")).toBe(true);
  });

  it("leaves pages alone", () => {
    expect(isImageLink("https://shop.example/p/bike")).toBe(false);
    expect(isImageLink("https://shop.example/jpg/bike.html")).toBe(false);
    expect(isImageLink("not a link.png")).toBe(false);
  });
});
