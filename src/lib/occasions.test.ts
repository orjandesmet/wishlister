import { describe, expect, it } from "vite-plus/test";
import {
  addDays,
  daysBetween,
  formatOccasionDate,
  nextOccasionPerGroup,
  splitOccasions,
  today,
} from "./occasions.ts";

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

describe("addDays", () => {
  it("moves across months and years", () => {
    expect(addDays("2026-10-21", 30)).toBe("2026-11-20");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
  });

  it("knows leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("goes back with a negative number", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("daysBetween", () => {
  it("counts whole days, across months, years and clock changes", () => {
    expect(daysBetween("2026-10-21", "2026-10-21")).toBe(0);
    expect(daysBetween("2026-10-21", "2026-12-25")).toBe(65);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("is negative once the date has passed", () => {
    expect(daysBetween("2026-10-21", "2026-10-20")).toBe(-1);
  });
});

describe("nextOccasionPerGroup", () => {
  const grouped = [
    { group_id: "family", name: "Christmas 2026", date: "2026-12-25" },
    { group_id: "family", name: "Christmas 2025", date: "2025-12-25" },
    { group_id: "family", name: "Sinterklaas 2026", date: "2026-12-06" },
    { group_id: "friends", name: "Secret Santa", date: "2026-12-20" },
    { group_id: "friends", name: "Birthday Bert", date: "2026-10-21" },
    { group_id: "club", name: "Summer party", date: "2026-07-01" },
  ];

  it("picks each group's soonest upcoming occasion, counting today", () => {
    const next = nextOccasionPerGroup(grouped, "2026-10-21", compare);
    expect(next.get("family")?.name).toBe("Sinterklaas 2026");
    expect(next.get("friends")?.name).toBe("Birthday Bert");
  });

  it("leaves out groups whose occasions have all passed", () => {
    expect(nextOccasionPerGroup(grouped, "2026-10-21", compare).has("club")).toBe(false);
  });

  it("breaks a same-day tie by name", () => {
    const sameDay = [
      { group_id: "family", name: "Christmas", date: "2026-12-25" },
      { group_id: "family", name: "Boxing day", date: "2026-12-25" },
    ];
    expect(nextOccasionPerGroup(sameDay, "2026-10-21", compare).get("family")?.name).toBe(
      "Boxing day",
    );
  });
});
