// Emails for a Secret Santa draw (#102): everyone who takes part hears who they
// drew, with a link to that person's list. Someone whose person was removed from the
// draw gets a new email with their new person.
//
// See supabase/migrations/20261027140000_secret_santa.sql.
//
// Like the digest, the texts live here instead of in src/i18n (which holds JSX).
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmails, type Email } from "./mail.ts";

/** One row of claim_secret_santa_notices(): one email. */
export type SecretSantaRow = {
  secret_santa_id: string;
  giver_profile_id: string;
  recipient_profile_id: string;
  recipient_name: string;
  occasion_name: string;
  /** "2026-12-25" */
  occasion_date: string;
  group_name: string;
  email: string;
  locale: string;
};

type Texts = {
  subject: (occasion: string) => string;
  /** `recipient`, `occasion` and `group` come escaped for the HTML version. */
  drawn: (recipient: string, occasion: string, group: string, date: string) => string;
  openList: string;
  secret: string;
  locale: string;
};

const texts: Record<"en" | "nl", Texts> = {
  en: {
    subject: (occasion) => `Your Secret Santa for ${occasion}`,
    drawn: (recipient, occasion, group, date) =>
      `You drew ${recipient} for ${occasion} (${date}) in ${group}.`,
    openList: "Open their list",
    secret: "Keep it secret! You now follow their list, and they see nothing about this.",
    locale: "en-GB",
  },
  nl: {
    subject: (occasion) => `Jouw Secret Santa voor ${occasion}`,
    drawn: (recipient, occasion, group, date) =>
      `Jij hebt ${recipient} getrokken voor ${occasion} (${date}) in ${group}.`,
    openList: "Open hun lijstje",
    secret: "Hou het geheim! Je volgt nu hun lijstje, en zij zien hier niets van.",
    locale: "nl-BE",
  },
};

function formatDate(isoDate: string, locale: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(date);
}

/** One email per row. `siteUrl` is where the app runs, for the link. */
export function buildSecretSantaEmails(rows: SecretSantaRow[], siteUrl: string): Email[] {
  const site = siteUrl.replace(/\/$/, "");
  return rows.map((row) => {
    const t = texts[row.locale === "nl" ? "nl" : "en"];
    const link = `${site}/lists/${row.recipient_profile_id}`;
    const date = formatDate(row.occasion_date, t.locale);
    const recipient = `<strong>${escapeHtml(row.recipient_name)}</strong>`;
    return {
      to: row.email,
      subject: t.subject(row.occasion_name),
      html: [
        `<p>${t.drawn(recipient, escapeHtml(row.occasion_name), escapeHtml(row.group_name), date)}</p>`,
        `<p><a href="${link}">${t.openList}</a></p>`,
        `<p style="color:#666;font-size:13px">${t.secret}</p>`,
      ].join("\n"),
      text: [
        t.drawn(row.recipient_name, row.occasion_name, row.group_name, date),
        `${t.openList}: ${link}`,
        t.secret,
      ].join("\n\n"),
    };
  });
}

/**
 * Mails everyone who hasn't heard who they drew yet. Claiming the rows marks them as
 * mailed, so two runs at once don't both send; a failed send hands them back for the
 * next run. `admin` is a client with the secret key.
 */
export async function sendSecretSantaNotices(
  admin: SupabaseClient,
  siteUrl: string,
): Promise<{ sent: number; errors: string[] }> {
  const { data, error } = await admin.rpc("claim_secret_santa_notices");
  if (error) return { sent: 0, errors: [`Couldn't collect Secret Santa pairs: ${error.message}`] };
  const rows = (data ?? []) as SecretSantaRow[];
  if (rows.length === 0) return { sent: 0, errors: [] };

  const result = await sendEmails(buildSecretSantaEmails(rows, siteUrl));
  if (result.errors.length > 0) {
    // Which emails of a failed batch went out isn't known; with fewer than 100
    // (one batch), nothing did.
    const { error: releaseError } = await admin.rpc("release_secret_santa_notices", {
      draw_ids: rows.map((row) => row.secret_santa_id),
      giver_ids: rows.map((row) => row.giver_profile_id),
    });
    if (releaseError) result.errors.push(`Couldn't release them: ${releaseError.message}`);
  }
  return result;
}
