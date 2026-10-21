/**
 * Occasions are plain dates ("2026-12-25"), not moments in time: Christmas is on
 * the 25th wherever you are. They're kept as ISO date strings, which sort and
 * compare correctly as text, so no Date or time zone gets involved.
 */
export type IsoDate = string;

export type DatedOccasion = { name: string; date: IsoDate };

/** Today on this device, as "2026-10-21". */
export function today(now = new Date()): IsoDate {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Splits occasions into upcoming (today counts, soonest first) and past (most
 * recent first). Same-day occasions sort by name.
 */
export function splitOccasions<T extends DatedOccasion>(
  occasions: T[],
  on: IsoDate,
  compare: (a: string, b: string) => number,
): { upcoming: T[]; past: T[] } {
  const byDate = (a: T, b: T) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const upcoming = occasions
    .filter((o) => o.date >= on)
    .sort((a, b) => byDate(a, b) || compare(a.name, b.name));
  const past = occasions
    .filter((o) => o.date < on)
    .sort((a, b) => byDate(b, a) || compare(a.name, b.name));
  return { upcoming, past };
}

/** "Fri 25 Dec 2026" in the given language. */
export function formatOccasionDate(date: IsoDate, locale: string) {
  const [year, month, day] = date.split("-").map(Number);
  // Noon UTC, formatted in UTC, so the day never shifts with the device's time zone.
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** The date `days` days after `date` (or before, when negative). */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return moved.toISOString().slice(0, 10);
}
