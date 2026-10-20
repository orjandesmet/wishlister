import { describe, expect, it } from "vite-plus/test";
import { linkLabel, splitLink } from "./links.ts";

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
  it("shows the site and path without www or a trailing slash", () => {
    expect(linkLabel("https://www.bol.com/nl/p/lego/")).toBe("bol.com/nl/p/lego");
  });

  it("shortens long links", () => {
    const label = linkLabel(`https://example.com/${"a".repeat(100)}`);
    expect(label).toHaveLength(60);
    expect(label.endsWith("…")).toBe(true);
  });
});
