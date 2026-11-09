import { describe, expect, it } from "vite-plus/test";
import { heartCount, nextWantedLevel } from "./wantedLevel.ts";

describe("heartCount", () => {
  it("shows no hearts for plain wanting, one for really, three for REALLY", () => {
    expect([1, 2, 3].map(heartCount)).toEqual([0, 1, 3]);
  });
});

describe("nextWantedLevel", () => {
  it("goes round", () => {
    expect(nextWantedLevel(1)).toBe(2);
    expect(nextWantedLevel(2)).toBe(3);
    expect(nextWantedLevel(3)).toBe(1);
  });
});
