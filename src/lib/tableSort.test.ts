import { beforeEach, describe, expect, it } from "vite-plus/test";
import {
  defaultTableSort,
  nextTableSort,
  readTableSort,
  saveTableSort,
  sortTableItems,
} from "./tableSort.ts";

type Row = { name: string; category: string | null; want: number; price: number | null };

const rows: Row[] = [
  { name: "b", category: "Books", want: 1, price: 20 },
  { name: "a", category: null, want: 3, price: null },
  { name: "c", category: "art", want: 3, price: 5 },
];
const compare = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });
const options = {
  compare,
  wantOf: (i: number) => rows[i].want,
  priceOf: (i: number) => rows[i].price,
  questionsOf: (i: number) => [0, 2, 1][i],
};
const names = (list: Row[]) => list.map((r) => r.name);

describe("nextTableSort", () => {
  it("sorts the column's natural way, then the other way, then back to the order added", () => {
    const first = nextTableSort(null, "price");
    expect(first).toEqual({ column: "price", direction: "ascending" });
    const second = nextTableSort(first, "price");
    expect(second).toEqual({ column: "price", direction: "descending" });
    expect(nextTableSort(second, "price")).toBeNull();
  });

  it("starts the most wanted first", () => {
    expect(nextTableSort({ column: "name", direction: "ascending" }, "wanted")).toEqual({
      column: "wanted",
      direction: "descending",
    });
  });
});

describe("sortTableItems", () => {
  it("keeps the order added without a sort", () => {
    expect(names(sortTableItems(rows, null, options))).toEqual(["b", "a", "c"]);
  });

  it("keeps ties in the order added", () => {
    const sort = { column: "wanted", direction: "descending" } as const;
    expect(names(sortTableItems(rows, sort, options))).toEqual(["a", "c", "b"]);
  });

  it("puts items without a price or category last, either way", () => {
    for (const direction of ["ascending", "descending"] as const) {
      expect(names(sortTableItems(rows, { column: "price", direction }, options)).at(-1)).toBe("a");
      expect(names(sortTableItems(rows, { column: "category", direction }, options)).at(-1)).toBe(
        "a",
      );
    }
    expect(
      names(sortTableItems(rows, { column: "category", direction: "ascending" }, options)),
    ).toEqual(["c", "b", "a"]);
  });

  it("sorts by questions", () => {
    const sort = { column: "questions", direction: "descending" } as const;
    expect(names(sortTableItems(rows, sort, options))).toEqual(["a", "c", "b"]);
  });

  it("puts what nobody bought first, but only when purchases can be told apart", () => {
    const sort = { column: "status", direction: "ascending" } as const;
    expect(names(sortTableItems(rows, sort, options))).toEqual(["b", "a", "c"]);
    const isBought = (i: number) => i === 0;
    expect(names(sortTableItems(rows, sort, { ...options, isBought }))).toEqual(["a", "c", "b"]);
  });
});

describe("saved table sort", () => {
  beforeEach(() => localStorage.clear());

  it("starts most wanted first", () => {
    expect(readTableSort()).toEqual(defaultTableSort);
  });

  it("remembers a column, and the order added", () => {
    saveTableSort({ column: "price", direction: "descending" });
    expect(readTableSort()).toEqual({ column: "price", direction: "descending" });
    saveTableSort(null);
    expect(readTableSort()).toBeNull();
  });

  it("ignores something it doesn't know", () => {
    localStorage.setItem("table-sort", "colour:up");
    expect(readTableSort()).toEqual(defaultTableSort);
  });
});
