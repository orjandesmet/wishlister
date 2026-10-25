import { createEffect, createSignal } from "solid-js";
import { addDays, daysBetween, type IsoDate } from "./occasions.ts";

/**
 * Themes recolour the app by overriding the colour tokens in index.css
 * (`:root[data-theme="christmas"] { … }`). You pick one on the account page, and
 * a group manager can give an occasion a theme: from two weeks before until the
 * day after, that theme shows instead of yours, unless you'd rather always keep
 * your own.
 *
 * Like i18n.ts, module-level signals and no Supabase, so components can use it
 * without a provider and Storybook works. Saving on the account is in accountTheme.ts.
 */

/** Every theme, in the order the pickers list them. */
export const themes = ["default", "christmas", "sinterklaas", "birthday"] as const;
export type ThemeId = (typeof themes)[number];

/** The themes an occasion can have: "default" is no theme there. Matches the check on occasions.theme. */
export const occasionThemes = themes.filter(
  (theme): theme is Exclude<ThemeId, "default"> => theme !== "default",
);
export type OccasionTheme = (typeof occasionThemes)[number];

export function isTheme(value: unknown): value is ThemeId {
  return themes.includes(value as ThemeId);
}

/** An occasion's theme shows from this many days before its date… */
export const THEME_DAYS_BEFORE = 14;
/** …until this many days after it. */
export const THEME_DAYS_AFTER = 1;

export type ThemedOccasion = { name: string; date: IsoDate; theme: OccasionTheme | null };

/** The first and last day an occasion's theme is shown, to fetch just those occasions. */
export function themeWindow(on: IsoDate) {
  return { from: addDays(on, -THEME_DAYS_AFTER), to: addDays(on, THEME_DAYS_BEFORE) };
}

/**
 * The occasion whose theme shows on `on`, or undefined. When several groups have a
 * themed occasion around then, the closest date wins; an upcoming one beats one
 * that has just passed, and same-day ones pick the first by name.
 */
export function activeOccasion<T extends ThemedOccasion>(
  occasions: T[],
  on: IsoDate,
  compare: (a: string, b: string) => number,
): T | undefined {
  const distance = (occasion: T) => daysBetween(on, occasion.date);
  return occasions
    .filter((occasion) => {
      const days = distance(occasion);
      return occasion.theme && days >= -THEME_DAYS_AFTER && days <= THEME_DAYS_BEFORE;
    })
    .sort((a, b) => {
      const da = distance(a);
      const db = distance(b);
      return Math.abs(da) - Math.abs(db) || db - da || compare(a.name, b.name);
    })[0];
}

const themeKey = "theme";
const keepMineKey = "theme-keep-mine";

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}

const savedTheme = readStorage(themeKey);
const [chosenTheme, setChosenThemeSignal] = createSignal<ThemeId>(
  isTheme(savedTheme) ? savedTheme : "default",
);
const [keepMyTheme, setKeepMyThemeSignal] = createSignal(readStorage(keepMineKey) === "true");
const [occasionNow, setOccasionNow] = createSignal<ThemedOccasion>();

/** The theme you picked. */
export { chosenTheme };
/** True when occasions shouldn't change your theme. */
export { keepMyTheme };
/** The occasion whose theme is due now in one of your groups, if any. Set by accountTheme.ts. */
export { occasionNow, setOccasionNow };

/** Picks your theme and remembers it on this device. */
export function setChosenTheme(next: ThemeId) {
  setChosenThemeSignal(next);
  writeStorage(themeKey, next);
}

/** Keeps your own theme even around occasions, remembered on this device. */
export function setKeepMyTheme(next: boolean) {
  setKeepMyThemeSignal(next);
  writeStorage(keepMineKey, String(next));
}

/** The theme showing right now: an occasion's, unless you keep your own. */
export function activeTheme(): ThemeId {
  const occasion = occasionNow();
  return !keepMyTheme() && occasion?.theme ? occasion.theme : chosenTheme();
}

/**
 * Puts the active theme on <html>, and gives the browser bar the page's
 * background colour. That follows dark mode too, so it listens for that.
 */
export function applyTheme() {
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const [scheme, setScheme] = createSignal(dark.matches);
  dark.addEventListener("change", (event) => setScheme(event.matches));
  createEffect(() => {
    const theme = activeTheme();
    scheme();
    const root = document.documentElement;
    if (theme === "default") delete root.dataset.theme;
    else root.dataset.theme = theme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).backgroundColor;
  });
}
