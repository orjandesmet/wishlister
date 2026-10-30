// The Secret Santa reminder (#139): a week before the occasion, everyone who takes
// part in its draw gets one email about the person they drew, bought or not. So the
// text has to work for people who are done too.
//
// See supabase/migrations/20261030130000_secret_santa_nudge_and_reminder.sql.
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmails, type Email } from "./mail.ts";

/** One row of claim_secret_santa_reminders(): one email. */
export type ReminderRow = {
  secret_santa_id: string;
  giver_profile_id: string;
  recipient_profile_id: string;
  recipient_name: string;
  occasion_name: string;
  /** "2026-12-25" */
  occasion_date: string;
  /** 1 to 7: usually 7, fewer when a run was missed. */
  days_left: number;
  email: string;
  locale: string;
};

type Texts = {
  subject: (days: number) => string;
  /** `occasion` and `recipient` come escaped for the HTML version. */
  body: (occasion: string, recipient: string, days: number) => string;
  openList: (recipient: string) => string;
};

const texts: Record<"en" | "nl", Texts> = {
  en: {
    subject: (days) =>
      `🎅 ${days} ${days === 1 ? "day" : "days"} left. The elves are getting nervous.`,
    body: (occasion, recipient, days) =>
      `${occasion} is ${days === 1 ? "tomorrow" : days === 7 ? "in a week" : `in ${days} days`} and you're ${recipient}'s Secret Santa. Already wrapped? Then put your feet up. Still empty-handed? There's still time, and ${recipient}'s list is right here.`,
    openList: (recipient) => `Open ${recipient}'s list`,
  },
  nl: {
    subject: (days) =>
      `🎅 Nog ${days} ${days === 1 ? "dag" : "dagen"}. De elfjes worden zenuwachtig.`,
    body: (occasion, recipient, days) =>
      `${days === 1 ? "Morgen" : days === 7 ? "Over een week" : `Over ${days} dagen`} is het ${occasion} en jij bent de Secret Santa van ${recipient}. Al ingepakt? Leg dan je voeten maar omhoog. Nog niets gevonden? Er is nog tijd, en het lijstje van ${recipient} staat hier klaar.`,
    openList: (recipient) => `Open het lijstje van ${recipient}`,
  },
};

/** One email per row. `siteUrl` is where the app runs, for the link. */
export function buildReminderEmails(rows: ReminderRow[], siteUrl: string): Email[] {
  const site = siteUrl.replace(/\/$/, "");
  return rows.map((row) => {
    const t = texts[row.locale === "nl" ? "nl" : "en"];
    const link = `${site}/lists/${row.recipient_profile_id}`;
    const recipient = escapeHtml(row.recipient_name);
    return {
      to: row.email,
      subject: t.subject(row.days_left),
      html: [
        `<p>${t.body(escapeHtml(row.occasion_name), `<strong>${recipient}</strong>`, row.days_left)}</p>`,
        `<p><a href="${link}">${t.openList(recipient)}</a></p>`,
      ].join("\n"),
      text: [
        t.body(row.occasion_name, row.recipient_name, row.days_left),
        `${t.openList(row.recipient_name)}: ${link}`,
      ].join("\n\n"),
    };
  });
}

/**
 * Sends the reminders that are due. Claiming the rows marks them as sent, so two runs
 * at once don't both send; a failed send hands them back for the next run. `admin` is
 * a client with the secret key.
 */
export async function sendSecretSantaReminders(
  admin: SupabaseClient,
  siteUrl: string,
): Promise<{ sent: number; errors: string[] }> {
  const { data, error } = await admin.rpc("claim_secret_santa_reminders");
  if (error) return { sent: 0, errors: [`Couldn't collect the reminders: ${error.message}`] };
  const rows = (data ?? []) as ReminderRow[];
  if (rows.length === 0) return { sent: 0, errors: [] };

  const result = await sendEmails(buildReminderEmails(rows, siteUrl));
  if (result.errors.length > 0) {
    const { error: releaseError } = await admin.rpc("release_secret_santa_reminders", {
      draw_ids: rows.map((row) => row.secret_santa_id),
      giver_ids: rows.map((row) => row.giver_profile_id),
    });
    if (releaseError) result.errors.push(`Couldn't release them: ${releaseError.message}`);
  }
  return result;
}
