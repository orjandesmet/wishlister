import { describe, expect, it } from "vite-plus/test";
import { arrangeItems, effectiveListOrder } from "./listOrder.ts";

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

  it("puts the most wanted first, keeping the order added among equals", () => {
    const want = [1, 2, 1, 3, 2, 1];
    expect(names(arrangeItems(items, "wanted", { compare, wantOf: (i) => want[i] }))).toEqual([
      ["Novel", "atlas", "Kite", "Puzzle", "Socks", "Mug"],
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

  // Puzzle 20, atlas none, Socks 5, Novel 20, Kite 35, Mug none.
  const prices = [20, null, 5, 20, 35, null];
  const priceOf = (i: number) => prices[i];

  it("sorts by price low to high, ties in the order added, no price last", () => {
    expect(names(arrangeItems(items, "priceAsc", { compare, priceOf }))).toEqual([
      ["Socks", "Puzzle", "Novel", "Kite", "atlas", "Mug"],
    ]);
  });

  it("sorts by price high to low, still with no price last", () => {
    expect(names(arrangeItems(items, "priceDesc", { compare, priceOf }))).toEqual([
      ["Kite", "Puzzle", "Novel", "Socks", "atlas", "Mug"],
    ]);
  });

  it("keeps the order added when prices aren't known", () => {
    expect(names(arrangeItems(items, "priceDesc", { compare }))).toEqual(
      names(arrangeItems(items, "added", { compare })),
    );
  });
});

describe("effectiveListOrder", () => {
  it("is most wanted first when nothing was picked and something is wanted more", () => {
    expect(effectiveListOrder(undefined, true)).toBe("wanted");
  });

  it("keeps the order added when nothing is wanted more than the rest", () => {
    expect(effectiveListOrder(undefined, false)).toBe("added");
    expect(effectiveListOrder("wanted", false)).toBe("added");
  });

  it("keeps what you picked", () => {
    expect(effectiveListOrder("name", true)).toBe("name");
    expect(effectiveListOrder("wanted", true)).toBe("wanted");
  });
});
