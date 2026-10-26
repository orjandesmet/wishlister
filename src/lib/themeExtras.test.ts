import { describe, expect, test } from "vite-plus/test";
import { makeFlakes, makePopParticles, themeExtras } from "./themeExtras.ts";

describe("makeFlakes", () => {
  test("spread across the button, more on a wider one", () => {
    const narrow = makeFlakes(80, () => 0.5);
    const wide = makeFlakes(300, () => 0.5);
    expect(wide.length).toBeGreaterThan(narrow.length);
    for (const flake of wide) {
      expect(flake.left).toBeGreaterThanOrEqual(0);
      expect(flake.left).toBeLessThanOrEqual(300);
    }
  });
});

describe("makePopParticles", () => {
  test("confetti pops out all around", () => {
    const confetti = makePopParticles(["🎉"], () => 0.5);
    expect(confetti.some((p) => p.dy < 0)).toBe(true);
    expect(confetti.some((p) => p.dy > 0)).toBe(true);
    expect(confetti.some((p) => p.dx < 0)).toBe(true);
    expect(confetti.some((p) => p.dx > 0)).toBe(true);
  });
});

test("each theme presses its own way; only New Year and the birthday pop", () => {
  expect(themeExtras.christmas.tap.kind).toBe("snow");
  expect(themeExtras.sinterklaas.tap.kind).toBe("shimmer");
  expect(themeExtras.newYear.tap.kind).toBe("pop");
  expect(themeExtras.birthday.tap.kind).toBe("pop");
  expect(themeExtras.halloween.tap).toMatchObject({ kind: "float", motion: "ghost" });
  expect(themeExtras.easter.tap).toMatchObject({ kind: "float", motion: "hop" });
});

test("Christmas brings Santa to the money burst", () => {
  expect(themeExtras.christmas.burst).toBe("🎅");
});
