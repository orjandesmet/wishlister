import { convertAmount, exchangeRates, type Rates } from "./currency.ts";
import type { ItemId } from "./ids.ts";
import { activeExtras, playPurchaseEffect, type BuyTap } from "./themeExtras.ts";
import styles from "./moneyBurst.module.css";

/** One flying 💸, 🪙 or seasonal guest: where it ends up, relative to where it starts, and how it moves. */
export type Particle = {
  emoji: string;
  /** Horizontal travel in px. */
  dx: number;
  /** Vertical travel in px; negative is up. */
  dy: number;
  /** Turn in degrees by the end. */
  rotate: number;
  /** Start delay in ms, so they don't all leave at once. */
  delay: number;
};

const count = 10;
/** Matches the longest animation in moneyBurst.module.css plus the largest delay. */
const lifetimeMs = 1100;

/**
 * Fans the particles out upwards, between 30° left and right of straight up, and
 * mostly money with a few coins. During a seasonal theme, its guest (🎅 at Christmas)
 * flies along twice. `random` is a parameter so tests get a fixed spread.
 */
export function makeParticles(random: () => number = Math.random, guest?: string): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((-30 + (60 * i) / (count - 1)) * Math.PI) / 180;
    const distance = 70 + random() * 50;
    return {
      emoji: guest && (i === 2 || i === 7) ? guest : i % 3 === 1 ? "🪙" : "💸",
      dx: Math.round(Math.sin(angle) * distance),
      dy: Math.round(-Math.cos(angle) * distance),
      rotate: Math.round((random() - 0.5) * 90),
      delay: Math.round(random() * 150),
    };
  });
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Sends a few 💸 flying up out of `from` (usually the button that was tapped).
 * Nothing is drawn when the device asks for reduced motion.
 *
 * It lives on <body>, not in the card, because the button it starts from is gone
 * as soon as the purchase is saved. It ignores taps and screen readers, and cleans up
 * after itself, so it never gets in the way of the update.
 */
export function burstMoney(from: DOMRect, guest?: string) {
  if (prefersReducedMotion()) return;
  const burst = document.createElement("div");
  burst.className = styles.burst;
  burst.setAttribute("aria-hidden", "true");
  burst.style.left = `${from.left + from.width / 2}px`;
  burst.style.top = `${from.top + from.height / 2}px`;
  for (const particle of makeParticles(Math.random, guest)) {
    const span = document.createElement("span");
    span.textContent = particle.emoji;
    span.style.setProperty("--dx", `${particle.dx}px`);
    span.style.setProperty("--dy", `${particle.dy}px`);
    span.style.setProperty("--rotate", `${particle.rotate}deg`);
    span.style.animationDelay = `${particle.delay}ms`;
    burst.append(span);
  }
  document.body.append(burst);
  setTimeout(() => burst.remove(), lifetimeMs);
}

/** Where "I bought this" was last tapped, until that purchase is saved. */
let lastTap: (BuyTap & { itemId: ItemId }) | undefined;

/**
 * Call when a buy button is tapped. Saving the purchase refetches the list, which can
 * rebuild the card, so the tap (and the card around it, for a seasonal theme's
 * effect) is kept here rather than in the card.
 */
export function rememberBuyTap(itemId: ItemId, button: Element) {
  const card = button.closest("li, article") ?? button;
  lastTap = {
    itemId,
    button: button.getBoundingClientRect(),
    card: card.getBoundingClientRect(),
    cardRadius: getComputedStyle(card).borderRadius,
  };
}

/** Bursting on every purchase gets old fast, so only gifts of this much or more get one. */
const minimumEuros = 50;

/**
 * Whether a purchase is big enough to celebrate: €50 or more, after converting other
 * currencies. No price, or one that can't be converted yet, stays quiet.
 */
export function isBigPurchase(
  price: number | null,
  currency: string | null,
  rates: Rates | null,
): boolean {
  if (price === null || currency === null) return false;
  const euros = convertAmount(price, currency, "EUR", rates);
  return euros !== null && euros >= minimumEuros;
}

/**
 * Call once the purchase is saved, if the remembered tap was on this item: plays the
 * seasonal theme's purchase effect, and bursts 💸 when the item costs €50 or more
 * (unless the theme has its own celebration instead).
 */
export function burstMoneyForTap(itemId: ItemId, price: number | null, currency: string | null) {
  const tap = lastTap;
  lastTap = undefined;
  if (tap?.itemId !== itemId) return;
  const extras = activeExtras();
  if (extras?.purchase) playPurchaseEffect(extras.purchase, tap);
  if (extras && !extras.moneyBurst) return;
  if (isBigPurchase(price, currency, exchangeRates())) burstMoney(tap.button, extras?.guest);
}
