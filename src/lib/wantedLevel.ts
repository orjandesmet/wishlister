import type { WantedLevel } from "./api/items.ts";

/**
 * How many hearts a wanted level shows: none for plain "I want this", one for "I really want
 * this", three for "I really, really, REALLY want this".
 */
export function heartCount(level: number): 0 | 1 | 3 {
  return level >= 3 ? 3 : level === 2 ? 1 : 0;
}

/** The level after this one when the hearts are tapped: round and round, 1 → 2 → 3 → 1. */
export function nextWantedLevel(level: WantedLevel): WantedLevel {
  return level === 3 ? 1 : ((level + 1) as WantedLevel);
}
