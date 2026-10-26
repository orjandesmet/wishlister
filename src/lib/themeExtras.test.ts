import { describe, expect, test } from "vite-plus/test";
import { makeFlakes, makePopParticles, themeExtras } from "./themeExtras.ts";

describe("makeFlakes", () => {
  test("spread across the card, more on a wider one", () => {
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

test("each theme celebrates a purchase its own way", () => {
  expect(themeExtras.sinterklaas.purchase).toBeUndefined();
  expect(themeExtras.christmas.purchase?.kind).toBe("snow");
  expect(themeExtras.newYear.purchase?.kind).toBe("pop");
  expect(themeExtras.birthday.purchase?.kind).toBe("pop");
  expect(themeExtras.halloween.purchase).toMatchObject({ kind: "float", motion: "ghost" });
  expect(themeExtras.easter.purchase).toMatchObject({ kind: "float", motion: "hop" });
});

test("only Sinterklaas and Christmas keep the money burst, with Santa at Christmas", () => {
  const bursting = Object.entries(themeExtras)
    .filter(([, extras]) => extras.moneyBurst)
    .map(([theme]) => theme);
  expect(bursting).toEqual(["sinterklaas", "christmas"]);
  expect(themeExtras.christmas.guest).toBe("🎅");
  expect(themeExtras.sinterklaas.guest).toBeUndefined();
});
