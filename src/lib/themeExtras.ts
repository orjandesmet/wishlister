import { activeTheme, type ThemeId } from "./theme.ts";
import styles from "./themeExtras.module.css";

/**
 * The little extras a seasonal theme adds on top of its colours and garland:
 * what flies out of a button when you press it, and who joins the 💸 when you buy
 * something big (moneyBurst.ts). All of it is decoration: hidden from screen
 * readers, never in the way of a tap, and not drawn at all with reduced motion.
 */
type Extras = {
  /** What falls or pops out of a pressed button. */
  tap: string[];
  /** True to let it drift down like snow, false to pop out in all directions. */
  falls: boolean;
  /** Joins the 💸 and 🪙 when a big purchase bursts. */
  burst: string;
};

export const themeExtras: Record<ThemeId, Extras> = {
  sinterklaas: { tap: ["🍪", "⭐"], falls: true, burst: "🐴" },
  christmas: { tap: ["❄️", "❄"], falls: true, burst: "🎅" },
  newYear: { tap: ["✨", "🎊"], falls: false, burst: "🥂" },
  birthday: { tap: ["🎉", "🎈"], falls: false, burst: "🎂" },
  halloween: { tap: ["🦇", "🕸️"], falls: false, burst: "🎃" },
  easter: { tap: ["🌸", "🐣"], falls: false, burst: "🐰" },
};

/** The active theme's guest for the money burst, if a theme is on. */
export function burstGuest(): string | undefined {
  const theme = activeTheme();
  return theme && themeExtras[theme].burst;
}

export type TapParticle = { emoji: string; dx: number; dy: number; delay: number };

const tapCount = 6;
/** Matches the animation in themeExtras.module.css plus the largest delay. */
const tapLifetimeMs = 1300;

/**
 * Where each particle goes from the press. Snow drifts down and a little sideways;
 * the rest pops out all around. `random` is a parameter so tests get a fixed spread.
 */
export function makeTapParticles(
  extras: Extras,
  random: () => number = Math.random,
): TapParticle[] {
  return Array.from({ length: tapCount }, (_, i) => {
    const emoji = extras.tap[i % extras.tap.length];
    const delay = Math.round(random() * 120);
    if (extras.falls) {
      return {
        emoji,
        dx: Math.round((random() - 0.5) * 70),
        dy: Math.round(40 + random() * 40),
        delay,
      };
    }
    const angle = (2 * Math.PI * i) / tapCount + random() * 0.6;
    const distance = 30 + random() * 25;
    return {
      emoji,
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
      delay,
    };
  });
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Draws the active theme's tap particles at a point on the screen. */
export function sprinkle(x: number, y: number, theme: ThemeId) {
  const extras = themeExtras[theme];
  const layer = document.createElement("div");
  layer.className = extras.falls ? `${styles.tap} ${styles.falls}` : styles.tap;
  layer.setAttribute("aria-hidden", "true");
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  for (const particle of makeTapParticles(extras)) {
    const span = document.createElement("span");
    span.textContent = particle.emoji;
    span.style.setProperty("--dx", `${particle.dx}px`);
    span.style.setProperty("--dy", `${particle.dy}px`);
    span.style.animationDelay = `${particle.delay}ms`;
    layer.append(span);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), tapLifetimeMs);
}

/**
 * Sprinkles the theme's particles from every button you press, while a theme is on.
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
      sprinkle(event.clientX, event.clientY, theme);
    },
    { passive: true },
  );
}
