import { createEffect, createSignal } from "solid-js";
import { today, type IsoDate } from "./occasions.ts";

/**
 * Seasonal themes: the app dresses up around fixed dates, by itself. A theme
 * recolours the app (`:root[data-theme="christmas"]` overrides the colour tokens in
 * index.css) and can add decorations (ThemeDecorations.tsx). Nobody manages them;
 * the calendar below is the whole configuration. Anyone can switch them off on the
 * Settings page (profiles.seasonal_themes).
 *
 * Like i18n.ts, module-level signals and no Supabase, so components can use it
 * without a provider and Storybook works.
 */

export const themes = [
  "sinterklaas",
  "christmas",
  "newYear",
  "birthday",
  "halloween",
  "easter",
] as const;
export type ThemeId = (typeof themes)[number];

export function isTheme(value: unknown): value is ThemeId {
  return themes.includes(value as ThemeId);
}

/** Themes that always show in dark mode, whatever the system says. */
export const darkThemes: readonly ThemeId[] = ["halloween"];

/** "12-25" from "2026-12-25". Month-day strings compare correctly as text. */
const monthDay = (date: IsoDate) => date.slice(5);

/** Easter Sunday in the given year, as "2027-03-28" (the Gregorian computus). */
export function easterSunday(year: number): IsoDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** When each theme shows. Checked in this order; the first match wins. */
const calendar: Record<ThemeId, (date: IsoDate) => boolean> = {
  // 1 to 6 December, ending on the Sint's own day.
  sinterklaas: (date) => monthDay(date) >= "12-01" && monthDay(date) <= "12-06",
  // 7 to 25 December.
  christmas: (date) => monthDay(date) >= "12-07" && monthDay(date) <= "12-25",
  // 26 December to 7 January, across the new year.
  newYear: (date) => monthDay(date) >= "12-26" || monthDay(date) <= "01-07",
  // Only on 1 March.
  birthday: (date) => monthDay(date) === "03-01",
  // 28 to 31 October.
  halloween: (date) => monthDay(date) >= "10-28" && monthDay(date) <= "10-31",
  // Good Friday to Easter Monday: Easter moves every year.
  easter: (date) => {
    const sunday = easterSunday(Number(date.slice(0, 4)));
    return date >= shift(sunday, -2) && date <= shift(sunday, 1);
  },
};

function shift(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** The theme for a date, or undefined on an ordinary day. */
export function themeOn(date: IsoDate): ThemeId | undefined {
  return themes.find((theme) => calendar[theme](date));
}

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

// The account's choice is on the profile; this device remembers it as well, so the
// login page and the first frame before the profile has loaded already follow it.
const themesKey = "seasonal-themes";
const [seasonalThemes, setSeasonalThemesSignal] = createSignal(readStorage(themesKey) !== "off");

/** False when you switched the seasonal themes off. */
export { seasonalThemes };

/** Follows the profile's choice, and remembers it on this device. */
export function setSeasonalThemes(on: boolean) {
  setSeasonalThemesSignal(on);
  writeStorage(themesKey, on ? "on" : "off");
}

/**
 * Trying a theme out without waiting for its date. On the dev server and on Netlify
 * deploy previews, open any page with `?theme=halloween` (or `?theme=none`) or
 * `?date=2026-12-24`; it sticks for the browser tab, and `?theme=` with nothing
 * clears it. Storybook's toolbar brush sets it too.
 */
export type ThemePreview = { theme?: ThemeId | "none"; date?: IsoDate };
const [preview, setThemePreview] = createSignal<ThemePreview>({});
export { setThemePreview };

const previewKey = "theme-preview";

/** Reads `?theme=` and `?date=` where previews are allowed. */
export function readThemePreview(url: URL, allowed: boolean): ThemePreview {
  if (!allowed) return {};
  let saved: ThemePreview = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(previewKey) ?? "{}") as ThemePreview;
  } catch {
    // Nothing saved, or storage blocked.
  }
  const theme = url.searchParams.get("theme");
  const date = url.searchParams.get("date");
  if (theme !== null) {
    saved.theme = isTheme(theme) || theme === "none" ? theme : undefined;
    if (!theme) saved.date = undefined;
  }
  if (date !== null) saved.date = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  try {
    sessionStorage.setItem(previewKey, JSON.stringify(saved));
  } catch {
    // The preview then lasts until the next page load.
  }
  return saved;
}

// Today, refreshed when the app comes back to the front, so an app left open
// overnight still changes theme.
const [day, setDay] = createSignal(today());
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setDay(today());
  });
}

/** The date's theme, or undefined. Doesn't look at whether themes are switched off. */
export function themeToday(): ThemeId | undefined {
  const { theme, date } = preview();
  if (theme) return theme === "none" ? undefined : theme;
  return themeOn(date ?? day());
}

/** The theme showing now: today's, unless you switched them off. A preview always shows. */
export function activeTheme(): ThemeId | undefined {
  if (!seasonalThemes() && !preview().theme && !preview().date) return undefined;
  return themeToday();
}

/**
 * Puts the active theme on <html>, and gives the browser bar the page's background
 * colour. That follows dark mode too, so it listens for that.
 */
export function applyTheme() {
  const isDev = import.meta.env.DEV || location.hostname.startsWith("deploy-preview-");
  setThemePreview(readThemePreview(new URL(location.href), isDev));
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const [scheme, setScheme] = createSignal(dark.matches);
  dark.addEventListener("change", (event) => setScheme(event.matches));
  createEffect(() => {
    const theme = activeTheme();
    scheme();
    const root = document.documentElement;
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).backgroundColor;
  });
}
