import { describe, expect, test } from "vite-plus/test";
import { makeTapParticles, themeExtras } from "./themeExtras.ts";

describe("makeTapParticles", () => {
  test("snow drifts down", () => {
    const flakes = makeTapParticles(themeExtras.christmas, () => 0.5);
    expect(flakes.length).toBeGreaterThan(0);
    for (const flake of flakes) expect(flake.dy).toBeGreaterThan(0);
    expect(flakes.every((f) => themeExtras.christmas.tap.includes(f.emoji))).toBe(true);
  });

  test("confetti pops out all around", () => {
    const confetti = makeTapParticles(themeExtras.birthday, () => 0.5);
    expect(confetti.some((p) => p.dy < 0)).toBe(true);
    expect(confetti.some((p) => p.dy > 0)).toBe(true);
    expect(confetti.some((p) => p.dx < 0)).toBe(true);
    expect(confetti.some((p) => p.dx > 0)).toBe(true);
  });
});

test("Christmas brings Santa to the money burst", () => {
  expect(themeExtras.christmas.burst).toBe("🎅");
});
