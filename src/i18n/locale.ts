/** The languages the app speaks. The first one is the fallback. */
export const locales = ["en", "nl"] as const;
export type Locale = (typeof locales)[number];

/** Each language in its own words, for the language picker. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
};

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

/**
 * The language to start in: the one saved on this device, else the first of the
 * browser's preferred languages we have ("nl-BE" counts as "nl"), else English.
 */
export function detectLocale(
  saved: string | null | undefined,
  preferred: readonly string[],
): Locale {
  if (isLocale(saved)) return saved;
  for (const tag of preferred) {
    const language = tag.toLowerCase().split("-")[0];
    if (isLocale(language)) return language;
  }
  return locales[0];
}
