import { describe, expect, it } from "vite-plus/test";
import { arrangeItems } from "./listOrder.ts";

const compare = (a: string, b: string) => a.localeCompare(b, "en");
const items = [
  { name: "Puzzle", category: "toys" },
  { name: "atlas", category: "Books" },
  { name: "Socks", category: null },
  { name: "Novel", category: "books" },
  { name: "Kite", category: "Toys" },
  { name: "Mug", category: " " },
];
const names = (sections: { items: { name: string }[] }[]) =>
  sections.map((s) => s.items.map((i) => i.name));

describe("arrangeItems", () => {
  it("keeps the order items were added", () => {
    expect(names(arrangeItems(items, "added", { compare }))).toEqual([
      ["Puzzle", "atlas", "Socks", "Novel", "Kite", "Mug"],
    ]);
  });

  it("puts the newest first", () => {
    expect(names(arrangeItems(items, "newest", { compare }))).toEqual([
      ["Mug", "Kite", "Novel", "Socks", "atlas", "Puzzle"],
    ]);
  });

  it("sorts by name, ignoring case", () => {
    expect(names(arrangeItems(items, "name", { compare }))).toEqual([
      ["atlas", "Kite", "Mug", "Novel", "Puzzle", "Socks"],
    ]);
  });

  it("groups by category A to Z, uncategorised last, merging spellings", () => {
    const sections = arrangeItems(items, "category", { compare });
    expect(sections.map((s) => s.category)).toEqual(["Books", "toys", null]);
    expect(names(sections)).toEqual([
      ["atlas", "Novel"],
      ["Puzzle", "Kite"],
      ["Socks", "Mug"],
    ]);
  });

  it("names a section after its most used spelling", () => {
    const more = [...items, { name: "Ball", category: "Toys" }];
    expect(arrangeItems(more, "category", { compare })[1].category).toBe("Toys");
  });

  it("puts items nobody bought first, keeping their order", () => {
    const bought = new Set([0, 3]);
    expect(
      names(arrangeItems(items, "available", { compare, isBought: (i) => bought.has(i) })),
    ).toEqual([["atlas", "Socks", "Kite", "Mug", "Puzzle", "Novel"]]);
  });

  it("ignores bought status when it isn't known (your own list)", () => {
    expect(names(arrangeItems(items, "available", { compare }))).toEqual(
      names(arrangeItems(items, "added", { compare })),
    );
  });
});
