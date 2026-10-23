import { beforeEach, describe, expect, test } from "vite-plus/test";
import type { ItemId } from "./ids.ts";
import { burstMoneyForTap, isBigPurchase, makeParticles, rememberBuyTap } from "./moneyBurst.ts";
import styles from "./moneyBurst.module.css";

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
  const bursts = () => document.querySelectorAll(`.${styles.burst}`).length;

  beforeEach(() => document.querySelectorAll(`.${styles.burst}`).forEach((b) => b.remove()));

  test("bursts once for the item that was tapped, even if its card was rebuilt", () => {
    tapOn("item-1");
    burstMoneyForTap("item-1" as ItemId, 60, "EUR");
    expect(bursts()).toBe(1);
    burstMoneyForTap("item-1" as ItemId, 60, "EUR");
    expect(bursts()).toBe(1);
  });

  test("stays quiet for a cheap item", () => {
    tapOn("item-1");
    burstMoneyForTap("item-1" as ItemId, 20, "EUR");
    expect(bursts()).toBe(0);
  });

  test("stays quiet for another item", () => {
    tapOn("item-1");
    burstMoneyForTap("item-2" as ItemId, 60, "EUR");
    expect(bursts()).toBe(0);
  });
});

describe("isBigPurchase", () => {
  const rates = { EUR: 1, USD: 1.25 };

  test("from €50", () => {
    expect(isBigPurchase(50, "EUR", null)).toBe(true);
    expect(isBigPurchase(49.99, "EUR", null)).toBe(false);
  });

  test("converts other currencies to euro", () => {
    expect(isBigPurchase(62.5, "USD", rates)).toBe(true);
    expect(isBigPurchase(60, "USD", rates)).toBe(false);
  });

  test("stays quiet without a price or a rate", () => {
    expect(isBigPurchase(null, null, rates)).toBe(false);
    expect(isBigPurchase(100, "USD", null)).toBe(false);
    expect(isBigPurchase(100, "XYZ", rates)).toBe(false);
  });
});
