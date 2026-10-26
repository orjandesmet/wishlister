import { activeTheme, type ThemeId } from "./theme.ts";
import styles from "./themeExtras.module.css";

/**
 * The little extras a seasonal theme adds on top of its colours and garland:
 * what a button does when you press it, and who joins the 💸 when you buy
 * something big (moneyBurst.ts). All of it is decoration: hidden from screen
 * readers, never in the way of a tap, and not drawn at all with reduced motion.
 *
 * Each theme presses differently:
 * - snow: a few flakes fall inside the button (Christmas)
 * - shimmer: a gold sheen sweeps across the button (Sinterklaas)
 * - pop: a little confetti pops out around the finger (New Year, birthday)
 * - ghost: one ghost floats up, swaying, and fades (Halloween)
 * - hop: one chick hops out to the side (Easter)
 */
export type TapEffect =
  | { kind: "snow" }
  | { kind: "shimmer" }
  | { kind: "pop"; emoji: string[] }
  | { kind: "float"; emoji: string; motion: "ghost" | "hop" };

type Extras = {
  tap: TapEffect;
  /** Joins the 💸 and 🪙 when a big purchase bursts. */
  burst: string;
};

export const themeExtras: Record<ThemeId, Extras> = {
  sinterklaas: { tap: { kind: "shimmer" }, burst: "🐴" },
  christmas: { tap: { kind: "snow" }, burst: "🎅" },
  newYear: { tap: { kind: "pop", emoji: ["✨", "🎊"] }, burst: "🥂" },
  birthday: { tap: { kind: "pop", emoji: ["🎉", "🎈"] }, burst: "🎂" },
  halloween: { tap: { kind: "float", emoji: "👻", motion: "ghost" }, burst: "🎃" },
  easter: { tap: { kind: "float", emoji: "🐣", motion: "hop" }, burst: "🐰" },
};

/** The active theme's guest for the money burst, if a theme is on. */
export function burstGuest(): string | undefined {
  const theme = activeTheme();
  return theme && themeExtras[theme].burst;
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
 * Snowflakes for a button `width` px wide: spread across it, small, each drifting
 * a little sideways as it falls.
 */
export function makeFlakes(width: number, random: () => number = Math.random): Flake[] {
  const count = Math.max(5, Math.min(14, Math.round(width / 18)));
  return Array.from({ length: count }, (_, i) => ({
    left: Math.round(((i + random()) / count) * width),
    size: Math.round(3 + random() * 3),
    drift: Math.round((random() - 0.5) * 16),
    delay: Math.round(random() * 250),
    duration: Math.round(700 + random() * 400),
  }));
}

/** How long each effect's layer stays, matching themeExtras.module.css. */
const lifetimeMs: Record<TapEffect["kind"], number> = {
  snow: 1400,
  shimmer: 1000,
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

/**
 * A box exactly over the button, with its rounded corners, to draw inside it
 * without touching the button itself (Solid owns its contents).
 */
function overButton(button: Element, className: string) {
  const rect = button.getBoundingClientRect();
  const box = layer(`${styles.inside} ${className}`);
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.top}px`;
  box.style.width = `${rect.width}px`;
  box.style.height = `${rect.height}px`;
  box.style.borderRadius = getComputedStyle(button).borderRadius;
  box.style.setProperty("--height", `${rect.height}px`);
  return { box, rect };
}

/** Plays the theme's press effect on a button pressed at (x, y). */
export function playTap(effect: TapEffect, button: Element, x: number, y: number) {
  let el: HTMLElement;
  switch (effect.kind) {
    case "snow": {
      const { box, rect } = overButton(button, styles.snow);
      for (const flake of makeFlakes(rect.width)) {
        const span = document.createElement("span");
        span.style.left = `${flake.left}px`;
        span.style.width = span.style.height = `${flake.size}px`;
        span.style.setProperty("--drift", `${flake.drift}px`);
        span.style.animationDelay = `${flake.delay}ms`;
        span.style.animationDuration = `${flake.duration}ms`;
        box.append(span);
      }
      el = box;
      break;
    }
    case "shimmer": {
      el = overButton(button, styles.shimmer).box;
      el.append(document.createElement("span"));
      break;
    }
    case "pop": {
      el = layer(styles.pop);
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
      el = layer(`${styles.float} ${styles[effect.motion]}`);
      const span = document.createElement("span");
      span.textContent = effect.emoji;
      el.append(span);
      break;
    }
  }
  if (effect.kind === "pop" || effect.kind === "float") {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
  document.body.append(el);
  setTimeout(() => el.remove(), lifetimeMs[effect.kind]);
}

/**
 * Plays the theme's press effect on every button you press, while a theme is on.
 * Call once at start-up. Listens on the document, so buttons added later count too.
 */
export function startThemeTaps() {
  document.addEventListener(
    "pointerdown",
    (event) => {
      const theme = activeTheme();
      if (!theme || prefersReducedMotion()) return;
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest("button, [role='button'], input[type='submit']");
      if (!button || (button as HTMLButtonElement).disabled) return;
      playTap(themeExtras[theme].tap, button, event.clientX, event.clientY);
    },
    { passive: true },
  );
}
