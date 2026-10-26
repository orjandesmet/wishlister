import { activeTheme, type ThemeId } from "./theme.ts";
import styles from "./themeExtras.module.css";

/**
 * What a seasonal theme adds when you press "I bought this", on top of its colours
 * and garland. Nothing on other buttons, on purpose: it should stay a small
 * surprise. All of it is decoration: hidden from screen readers, never in the way of
 * a tap, and not drawn at all with reduced motion.
 *
 * - Sinterklaas: nothing extra.
 * - Christmas: snow falls inside the item's card; big purchases still get the 💸, with 🎅.
 * - New Year, birthday: a little confetti pops out of the button; no 💸.
 * - Halloween: a ghost floats up at the right of the card; no 💸.
 * - Easter: a chick hops along at the right of the card; no 💸.
 */
export type PurchaseEffect =
  | { kind: "snow" }
  | { kind: "pop"; emoji: string[] }
  | { kind: "float"; emoji: string; motion: "ghost" | "hop" };

type Extras = {
  purchase?: PurchaseEffect;
  /** Whether a big purchase still bursts 💸 during this theme. */
  moneyBurst: boolean;
  /** Joins the 💸 and 🪙 when a big purchase bursts. */
  guest?: string;
};

export const themeExtras: Record<ThemeId, Extras> = {
  sinterklaas: { moneyBurst: true },
  christmas: { purchase: { kind: "snow" }, moneyBurst: true, guest: "🎅" },
  newYear: { purchase: { kind: "pop", emoji: ["✨", "🎊"] }, moneyBurst: false },
  birthday: { purchase: { kind: "pop", emoji: ["🎉", "🎈"] }, moneyBurst: false },
  halloween: { purchase: { kind: "float", emoji: "👻", motion: "ghost" }, moneyBurst: false },
  easter: { purchase: { kind: "float", emoji: "🐣", motion: "hop" }, moneyBurst: false },
};

/** The extras of the theme showing right now, if any. */
export function activeExtras(): Extras | undefined {
  const theme = activeTheme();
  return theme ? themeExtras[theme] : undefined;
}

export type PopParticle = { emoji: string; dx: number; dy: number; delay: number };

const popCount = 6;

/**
 * Where each bit of confetti goes from the press: out all around, not far.
 * `random` is a parameter so tests get a fixed spread.
 */
export function makePopParticles(
  emoji: string[],
  random: () => number = Math.random,
): PopParticle[] {
  return Array.from({ length: popCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / popCount + random() * 0.6;
    const distance = 30 + random() * 25;
    return {
      emoji: emoji[i % emoji.length],
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
      delay: Math.round(random() * 120),
    };
  });
}

export type Flake = { left: number; size: number; drift: number; delay: number; duration: number };

/**
 * Snowflakes for a card `width` px wide: spread across it, small, each drifting
 * a little sideways as it falls.
 */
export function makeFlakes(width: number, random: () => number = Math.random): Flake[] {
  const count = Math.max(6, Math.min(22, Math.round(width / 14)));
  return Array.from({ length: count }, (_, i) => ({
    left: Math.round(((i + random()) / count) * width),
    size: Math.round(3 + random() * 3),
    drift: Math.round((random() - 0.5) * 16),
    delay: Math.round(random() * 250),
    duration: Math.round(1000 + random() * 400),
  }));
}

/** How long each effect's layer stays, matching themeExtras.module.css. */
const lifetimeMs: Record<PurchaseEffect["kind"], number> = {
  snow: 1800,
  pop: 900,
  float: 1100,
};

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function layer(className: string) {
  const div = document.createElement("div");
  div.className = className;
  div.setAttribute("aria-hidden", "true");
  return div;
}

/** Where "I bought this" was pressed: the button and the item's card, as they were then. */
export type BuyTap = { button: DOMRect; card: DOMRect; cardRadius: string };

/**
 * Plays the theme's purchase effect. Called once the purchase is saved, from the
 * rectangles remembered at the tap: by then the card may have been rebuilt. It's
 * drawn on <body> over where they were, without touching the card (Solid owns it).
 */
export function playPurchaseEffect(effect: PurchaseEffect, tap: BuyTap) {
  if (prefersReducedMotion()) return;
  let el: HTMLElement;
  switch (effect.kind) {
    case "snow": {
      const { card } = tap;
      el = layer(`${styles.inside} ${styles.snow}`);
      el.style.left = `${card.left}px`;
      el.style.top = `${card.top}px`;
      el.style.width = `${card.width}px`;
      el.style.height = `${card.height}px`;
      el.style.borderRadius = tap.cardRadius;
      el.style.setProperty("--height", `${card.height}px`);
      for (const flake of makeFlakes(card.width)) {
        const span = document.createElement("span");
        span.style.left = `${flake.left}px`;
        span.style.width = span.style.height = `${flake.size}px`;
        span.style.setProperty("--drift", `${flake.drift}px`);
        span.style.animationDelay = `${flake.delay}ms`;
        span.style.animationDuration = `${flake.duration}ms`;
        el.append(span);
      }
      break;
    }
    case "pop": {
      el = layer(styles.pop);
      el.style.left = `${tap.button.left + tap.button.width / 2}px`;
      el.style.top = `${tap.button.top + tap.button.height / 2}px`;
      for (const particle of makePopParticles(effect.emoji)) {
        const span = document.createElement("span");
        span.textContent = particle.emoji;
        span.style.setProperty("--dx", `${particle.dx}px`);
        span.style.setProperty("--dy", `${particle.dy}px`);
        span.style.animationDelay = `${particle.delay}ms`;
        el.append(span);
      }
      break;
    }
    case "float": {
      // At the right of the card, halfway down.
      el = layer(`${styles.float} ${styles[effect.motion]}`);
      el.style.left = `${tap.card.right - 28}px`;
      el.style.top = `${tap.card.top + tap.card.height / 2}px`;
      const span = document.createElement("span");
      span.textContent = effect.emoji;
      el.append(span);
      break;
    }
  }
  document.body.append(el);
  setTimeout(() => el.remove(), lifetimeMs[effect.kind]);
}
