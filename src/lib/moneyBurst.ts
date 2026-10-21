/** One flying 💸 or 🪙: where it ends up, relative to where it starts, and how it moves. */
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
/** Matches the longest animation in `.money-burst` plus the largest delay. */
const lifetimeMs = 1100;

/**
 * Fans the particles out upwards, between 30° left and right of straight up, and
 * mostly money with a few coins. `random` is a parameter so tests get a fixed spread.
 */
export function makeParticles(random: () => number = Math.random): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((-30 + (60 * i) / (count - 1)) * Math.PI) / 180;
    const distance = 70 + random() * 50;
    return {
      emoji: i % 3 === 1 ? "🪙" : "💸",
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
export function burstMoney(from: DOMRect) {
  if (prefersReducedMotion()) return;
  const burst = document.createElement("div");
  burst.className = "money-burst";
  burst.setAttribute("aria-hidden", "true");
  burst.style.left = `${from.left + from.width / 2}px`;
  burst.style.top = `${from.top + from.height / 2}px`;
  for (const particle of makeParticles()) {
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
