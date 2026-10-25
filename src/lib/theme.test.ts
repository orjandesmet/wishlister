import { describe, expect, test } from "vite-plus/test";
import { activeOccasion, isTheme, themeWindow, type ThemedOccasion } from "./theme.ts";

const compare = (a: string, b: string) => a.localeCompare(b);
const occasion = (name: string, date: string, theme: ThemedOccasion["theme"] = "christmas") => ({
  name,
  date,
  theme,
});

describe("activeOccasion", () => {
  test("shows a theme from two weeks before until the day after", () => {
    const christmas = [occasion("Christmas", "2026-12-25")];
    expect(activeOccasion(christmas, "2026-12-10", compare)).toBeUndefined();
    expect(activeOccasion(christmas, "2026-12-11", compare)?.name).toBe("Christmas");
    expect(activeOccasion(christmas, "2026-12-25", compare)?.name).toBe("Christmas");
    expect(activeOccasion(christmas, "2026-12-26", compare)?.name).toBe("Christmas");
    expect(activeOccasion(christmas, "2026-12-27", compare)).toBeUndefined();
  });

  test("skips occasions without a theme", () => {
    const occasions = [occasion("Christmas", "2026-12-25", null)];
    expect(activeOccasion(occasions, "2026-12-20", compare)).toBeUndefined();
  });

  test("the closest date wins across groups", () => {
    const occasions = [
      occasion("Christmas", "2026-12-25"),
      occasion("Sinterklaas", "2026-12-06", "sinterklaas"),
    ];
    expect(activeOccasion(occasions, "2026-12-01", compare)?.name).toBe("Sinterklaas");
    expect(activeOccasion(occasions, "2026-12-07", compare)?.name).toBe("Sinterklaas");
    expect(activeOccasion(occasions, "2026-12-12", compare)?.name).toBe("Christmas");
  });

  test("an upcoming occasion beats one that just passed at the same distance", () => {
    const occasions = [
      occasion("Anna's birthday", "2026-11-09", "birthday"),
      occasion("Bert's birthday", "2026-11-11", "birthday"),
    ];
    expect(activeOccasion(occasions, "2026-11-10", compare)?.name).toBe("Bert's birthday");
  });

  test("same day picks the first by name", () => {
    const occasions = [occasion("Zoo party", "2026-12-25"), occasion("Christmas", "2026-12-25")];
    expect(activeOccasion(occasions, "2026-12-20", compare)?.name).toBe("Christmas");
  });
});

test("themeWindow covers the dates whose theme can show on a day", () => {
  expect(themeWindow("2026-12-31")).toEqual({ from: "2026-12-30", to: "2027-01-14" });
});

test("isTheme", () => {
  expect(isTheme("christmas")).toBe(true);
  expect(isTheme("halloween")).toBe(false);
  expect(isTheme(undefined)).toBe(false);
});
