import { beforeEach, describe, expect, it } from "vite-plus/test";
import { chooseCompactCards, compactCards, setCompactCards } from "./compactCards.ts";

describe("compact cards", () => {
  beforeEach(() => {
    localStorage.clear();
    setCompactCards(false);
  });

  it("keeps a copy of the choice on this device", () => {
    setCompactCards(true);
    expect(compactCards()).toBe(true);
    expect(localStorage.getItem("compact-cards")).toBe("true");
  });

  it("switches right away and saves the choice", async () => {
    const saved: boolean[] = [];
    await chooseCompactCards(true, async (on) => {
      expect(compactCards()).toBe(true);
      saved.push(on);
    });
    expect(saved).toEqual([true]);
  });

  it("switches back when saving fails", async () => {
    await expect(
      chooseCompactCards(true, () => Promise.reject(new Error("offline"))),
    ).rejects.toThrow("offline");
    expect(compactCards()).toBe(false);
  });
});
