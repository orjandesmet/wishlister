/** The categories suggested even before anyone used one; translated as `categories.<key>`. */
export const starterCategoryKeys = [
  "books",
  "clothes",
  "toys",
  "games",
  "music",
  "experiences",
  "home",
  "sports",
] as const;

/**
 * Picks the category suggestions under the item form's category field.
 *
 * Categories already in use come first, most used first. Spellings that only
 * differ in case ("books", "Books") count as one and show the most used spelling.
 * The starter set fills in after them, so a brand-new account still sees some.
 * With a query, only categories containing it are kept; the exact current value is left out.
 */
export function suggestCategories(
  used: string[],
  starters: string[],
  query = "",
  limit = 8,
): string[] {
  const byKey = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const raw of used) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    const entry = byKey.get(key) ?? { count: 0, spellings: new Map() };
    entry.count++;
    entry.spellings.set(value, (entry.spellings.get(value) ?? 0) + 1);
    byKey.set(key, entry);
  }

  const ranked = [...byKey.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ spellings }) => [...spellings].sort((a, b) => b[1] - a[1])[0][0]);
  for (const starter of starters) {
    if (!byKey.has(starter.toLocaleLowerCase())) ranked.push(starter);
  }

  const q = query.trim().toLocaleLowerCase();
  return ranked
    .filter((c) => {
      const key = c.toLocaleLowerCase();
      return key !== q && key.includes(q);
    })
    .slice(0, limit);
}
