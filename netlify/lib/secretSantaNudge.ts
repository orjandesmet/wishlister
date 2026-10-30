// The Secret Santa nudge (#138): the person someone drew is asked to add some ideas
// to their list. It never says who sent it: everyone in the draw has a Secret Santa,
// so "your Secret Santa" gives nothing away.
//
// See supabase/migrations/20261030130000_secret_santa_nudge_and_reminder.sql.
import { escapeHtml, type Email } from "./mail.ts";
import { formatDate } from "./secretSantaNotices.ts";

/** What claim_secret_santa_nudge() hands back: one email. */
export type NudgeRow = {
  secret_santa_id: string;
  previous_nudged_at: string | null;
  /** Who is nudged, for the link to their own list. */
  recipient_profile_id: string;
  occasion_name: string;
  /** "2026-12-25" */
  occasion_date: string;
  email: string;
  locale: string;
};

type Texts = {
  subject: string;
  /** `occasion` comes escaped for the HTML version. */
  body: (occasion: string, date: string) => string;
  openList: string;
  secret: string;
  locale: string;
};

const texts: Record<"en" | "nl", Texts> = {
  en: {
    subject: "Your Secret Santa would love some ideas",
    body: (occasion, date) =>
      `Your Secret Santa for ${occasion} (${date}) would love some ideas. Add a few things to your wish list, so they know what would make you happy.`,
    openList: "Open your list",
    secret: "Who sent this stays a secret, like the rest of the draw.",
    locale: "en-GB",
  },
  nl: {
    subject: "Je Secret Santa kan wel wat ideeën gebruiken",
    body: (occasion, date) =>
      `Je Secret Santa voor ${occasion} (${date}) kan wel wat ideeën gebruiken. Zet een paar dingen op je lijstje, zodat die weet waar je blij van wordt.`,
    openList: "Open je lijstje",
    secret: "Wie dit stuurde blijft geheim, net als de rest van de trekking.",
    locale: "nl-BE",
  },
};

/** The email for one nudge. `siteUrl` is where the app runs, for the link. */
export function buildNudgeEmail(row: NudgeRow, siteUrl: string): Email {
  const t = texts[row.locale === "nl" ? "nl" : "en"];
  const link = `${siteUrl.replace(/\/$/, "")}/lists/${row.recipient_profile_id}`;
  const date = formatDate(row.occasion_date, t.locale);
  return {
    to: row.email,
    subject: t.subject,
    html: [
      `<p>${t.body(escapeHtml(row.occasion_name), date)}</p>`,
      `<p><a href="${link}">${t.openList}</a></p>`,
      `<p style="color:#666;font-size:13px">${t.secret}</p>`,
    ].join("\n"),
    text: [t.body(row.occasion_name, date), `${t.openList}: ${link}`, t.secret].join("\n\n"),
  };
}
