import type { MinLoopSize } from "./api/secretSanta.ts";

/**
 * The numbers offered as a minimum loop size: from 2 up to half the participants, rounded
 * down. Nothing for fewer than 4 participants, where only "all" (one loop) makes sense. The
 * Netlify function checks the same range (netlify/lib/secretSanta.ts).
 */
export function loopSizeOptions(participants: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(participants / 2) - 1) }, (_, i) => i + 2);
}

/**
 * The size to use for these participants: what was picked, or the biggest offered when fewer
 * people take part now than when it was picked.
 */
export function effectiveLoopSize(picked: MinLoopSize, participants: number): MinLoopSize {
  if (picked === "all") return "all";
  const options = loopSizeOptions(participants);
  return options.length === 0 ? "all" : Math.min(picked, options[options.length - 1]);
}
