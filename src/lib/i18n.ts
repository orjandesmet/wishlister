import * as i18n from "@solid-primitives/i18n";
import { createSignal } from "solid-js";
import { en } from "../i18n/en.tsx";
import { detectLocale, type Locale } from "../i18n/locale.ts";
import { nl } from "../i18n/nl.tsx";

export { localeNames, locales, type Locale } from "../i18n/locale.ts";

// Flattened once, so t("group.members") is a plain lookup.
const dictionaries = { en: i18n.flatten(en), nl: i18n.flatten(nl) };

const storageKey = "locale";

function readSaved() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

// A module-level signal: every component reads the same language, without a
// provider, so Storybook stories need no wrapper either. This module stays free of
// Supabase for the same reason; saving the language on the account is in accountLocale.ts.
const [locale, setLocaleSignal] = createSignal<Locale>(
  detectLocale(readSaved(), navigator.languages),
);
document.documentElement.lang = locale();

/** The active language. Reading it in JSX re-renders that bit when it changes. */
export { locale };

/**
 * Looks up UI text in the active language: t("nav.groups"), or
 * t("group.added", { email }) for text with values in it. Keys and arguments are
 * type-checked against en.tsx. Use it inside JSX or an effect to follow language changes.
 */
export const t = i18n.translator(() => dictionaries[locale()]);

/** Switches the language and remembers it on this device. */
export function setLocale(next: Locale) {
  setLocaleSignal(next);
  document.documentElement.lang = next;
  try {
    localStorage.setItem(storageKey, next);
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}

/** "Anna, Bert and Lucas" or "Anna, Bert en Lucas", following the active language. */
export function formatList(items: string[]) {
  return new Intl.ListFormat(locale(), { type: "conjunction" }).format(items);
}

/** Compares names the way the active language sorts them (accents, case…). */
export function compareNames(a: string, b: string) {
  return a.localeCompare(b, locale());
}
