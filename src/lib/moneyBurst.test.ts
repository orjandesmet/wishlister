import { describe, expect, test } from "vite-plus/test";
import { makeParticles } from "./moneyBurst.ts";

describe("makeParticles", () => {
  const particles = makeParticles(() => 0.5);

  test("all fly upwards", () => {
    expect(particles.length).toBeGreaterThan(0);
    for (const p of particles) expect(p.dy).toBeLessThan(0);
  });

  test("fan out to both sides", () => {
    expect(particles[0].dx).toBeLessThan(0);
    expect(particles.at(-1)!.dx).toBeGreaterThan(0);
  });

  test("are mostly money, with some coins", () => {
    const money = particles.filter((p) => p.emoji === "💸").length;
    expect(money).toBeGreaterThan(particles.length / 2);
    expect(particles.some((p) => p.emoji === "🪙")).toBe(true);
  });
});
