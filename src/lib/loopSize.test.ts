import { describe, expect, it } from "vite-plus/test";
import { effectiveLoopSize, loopSizeOptions } from "./loopSize.ts";

describe("loopSizeOptions", () => {
  it("offers nothing below 4 participants", () => {
    expect([0, 1, 2, 3].map(loopSizeOptions)).toEqual([[], [], [], []]);
  });

  it("runs from 2 to half the participants, rounded down", () => {
    expect(loopSizeOptions(4)).toEqual([2]);
    expect(loopSizeOptions(5)).toEqual([2]);
    expect(loopSizeOptions(6)).toEqual([2, 3]);
    expect(loopSizeOptions(9)).toEqual([2, 3, 4]);
    expect(loopSizeOptions(10)).toEqual([2, 3, 4, 5]);
  });
});

describe("effectiveLoopSize", () => {
  it("keeps 'all' and numbers that are still offered", () => {
    expect(effectiveLoopSize("all", 8)).toBe("all");
    expect(effectiveLoopSize(3, 8)).toBe(3);
  });

  it("falls back to the biggest offered when fewer people take part now", () => {
    expect(effectiveLoopSize(5, 8)).toBe(4);
    expect(effectiveLoopSize(4, 6)).toBe(3);
  });

  it("falls back to 'all' when nothing but that is offered", () => {
    expect(effectiveLoopSize(2, 3)).toBe("all");
  });
});
