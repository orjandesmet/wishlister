import { describe, expect, it } from "vite-plus/test";
import type { PendingCleanup } from "./api/cleanup.ts";
import { cleanupPrompts } from "./cleanup.ts";
import type { OccasionId } from "./ids.ts";

const row = (id: string, name: string, date: string, count: number): PendingCleanup => ({
  occasion_id: id as OccasionId,
  occasion_name: name,
  occasion_date: date,
  item_count: count,
});

describe("cleanupPrompts", () => {
  it("asks once per occasion, oldest first", () => {
    expect(
      cleanupPrompts([
        row("b", "Christmas 2026", "2026-12-25", 2),
        row("a", "Sinterklaas", "2026-12-06", 1),
      ]),
    ).toEqual([
      { occasionIds: ["a"], name: "Sinterklaas", date: "2026-12-06", count: 1 },
      { occasionIds: ["b"], name: "Christmas 2026", date: "2026-12-25", count: 2 },
    ]);
  });

  it("joins the same occasion of two groups", () => {
    expect(
      cleanupPrompts([
        row("a", "Christmas 2026", "2026-12-25", 2),
        row("b", "christmas 2026 ", "2026-12-25", 3),
      ]),
    ).toEqual([{ occasionIds: ["a", "b"], name: "Christmas 2026", date: "2026-12-25", count: 5 }]);
  });

  it("keeps same-named occasions on other days apart", () => {
    expect(
      cleanupPrompts([
        row("a", "Birthday", "2026-03-01", 1),
        row("b", "Birthday", "2027-03-01", 1),
      ]).map((p) => p.occasionIds),
    ).toEqual([["a"], ["b"]]);
  });

  it("is empty without anything to clean up", () => {
    expect(cleanupPrompts([])).toEqual([]);
  });
});
