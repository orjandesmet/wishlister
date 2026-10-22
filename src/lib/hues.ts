/**
 * Every person and category gets one pale hue, the same wherever it shows up. Hues are degrees on
 * the colour wheel, spread apart and skipping violet; the CSS turns one into a tint and its ink.
 */
const HUES = [215, 38, 150, 335, 185, 8];

/** A stable hue for any string (a profile id, a category name). */
export function hueFor(key: string): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return HUES[hash % HUES.length];
}
