import { beforeEach, describe, expect, test } from "vite-plus/test";
import type { ItemId } from "./ids.ts";
import { burstMoneyForTap, makeParticles, rememberBuyTap } from "./moneyBurst.ts";

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

describe("burstMoneyForTap", () => {
  const tapOn = (itemId: string) => {
    const button = document.createElement("button");
    rememberBuyTap(itemId as ItemId, button);
  };
  const bursts = () => document.querySelectorAll(".money-burst").length;

  beforeEach(() => document.querySelectorAll(".money-burst").forEach((b) => b.remove()));

  test("bursts once for the item that was tapped, even if its card was rebuilt", () => {
    tapOn("item-1");
    burstMoneyForTap("item-1" as ItemId);
    expect(bursts()).toBe(1);
    burstMoneyForTap("item-1" as ItemId);
    expect(bursts()).toBe(1);
  });

  test("stays quiet for another item", () => {
    tapOn("item-1");
    burstMoneyForTap("item-2" as ItemId);
    expect(bursts()).toBe(0);
  });
});
