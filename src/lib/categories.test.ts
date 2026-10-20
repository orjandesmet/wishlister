import { describe, expect, it } from "vite-plus/test";
import { suggestCategories } from "./categories.ts";

const starters = ["Books", "Clothes", "Toys"];

describe("suggestCategories", () => {
  it("shows the starter set when nothing is in use yet", () => {
    expect(suggestCategories([], starters)).toEqual(["Books", "Clothes", "Toys"]);
  });

  it("puts categories in use first, most used first", () => {
    expect(suggestCategories(["Lego", "Music", "Music"], starters)).toEqual([
      "Music",
      "Lego",
      "Books",
      "Clothes",
      "Toys",
    ]);
  });

  it("collapses case-only duplicates into the most used spelling", () => {
    expect(suggestCategories(["books", "Books", "Books", " toys "], starters)).toEqual([
      "Books",
      "toys",
      "Clothes",
    ]);
  });

  it("filters on what's typed, ignoring case, and leaves out an exact match", () => {
    expect(suggestCategories(["Board games"], starters, "o")).toEqual([
      "Board games",
      "Books",
      "Clothes",
      "Toys",
    ]);
    expect(suggestCategories(["Board games"], starters, "BOO")).toEqual(["Books"]);
    expect(suggestCategories([], starters, "toys")).toEqual([]);
  });

  it("keeps at most the limit", () => {
    expect(suggestCategories([], starters, "", 2)).toEqual(["Books", "Clothes"]);
  });
});
