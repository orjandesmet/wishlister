import { describe, expect, it } from "vite-plus/test";
import { formatOccasionDate, splitOccasions, today } from "./occasions.ts";

const compare = (a: string, b: string) => a.localeCompare(b, "en");
const occasions = [
  { name: "Easter 2027", date: "2027-03-28" },
  { name: "Christmas 2025", date: "2025-12-25" },
  { name: "Sinterklaas 2026", date: "2026-12-06" },
  { name: "Christmas 2026", date: "2026-12-25" },
  { name: "Birthday Anna", date: "2026-10-21" },
  { name: "Easter 2026", date: "2026-04-05" },
  { name: "Boxing day", date: "2026-12-25" },
];
const names = (list: { name: string }[]) => list.map((o) => o.name);

describe("splitOccasions", () => {
  it("lists upcoming occasions soonest first, counting today, then by name", () => {
    const { upcoming } = splitOccasions(occasions, "2026-10-21", compare);
    expect(names(upcoming)).toEqual([
      "Birthday Anna",
      "Sinterklaas 2026",
      "Boxing day",
      "Christmas 2026",
      "Easter 2027",
    ]);
  });

  it("lists past occasions most recent first", () => {
    const { past } = splitOccasions(occasions, "2026-10-21", compare);
    expect(names(past)).toEqual(["Easter 2026", "Christmas 2025"]);
  });

  it("doesn't reorder the list it was given", () => {
    const copy = [...occasions];
    splitOccasions(occasions, "2026-10-21", compare);
    expect(occasions).toEqual(copy);
  });
});

describe("today", () => {
  it("uses the device's own calendar day", () => {
    expect(today(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(today(new Date(2026, 11, 25, 0, 1))).toBe("2026-12-25");
  });
});

describe("formatOccasionDate", () => {
  it("formats the date in the given language without shifting the day", () => {
    // Punctuation differs between ICU versions, so only the parts are checked.
    expect(formatOccasionDate("2026-12-25", "en-GB")).toMatch(/^Fri,? 25 Dec 2026$/);
    expect(formatOccasionDate("2026-12-25", "nl")).toMatch(/^vr\.?,? 25 dec\.? 2026$/);
    expect(formatOccasionDate("2027-01-01", "en-GB")).toMatch(/^Fri,? 1 Jan 2027$/);
  });
});
