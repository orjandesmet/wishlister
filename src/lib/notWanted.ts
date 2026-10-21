/**
 * Quick add makes a "please don't buy" entry when the line starts with "!", as in
 * "!mugs". Returns the rest of the line, trimmed, and whether it was there.
 */
export function splitNotWanted(text: string): { notWanted: boolean; text: string } {
  const trimmed = text.trim();
  if (!trimmed.startsWith("!")) return { notWanted: false, text: trimmed };
  return { notWanted: true, text: trimmed.slice(1).trim() };
}
