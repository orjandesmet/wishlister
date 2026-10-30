// The Secret Santa reminder (#139): a week before the occasion, everyone who takes
// part in its draw finds a few lines about the person they drew at the top of their
// evening digest, bought or not. So the text has to work for people who are done too.
// Only in a digest: someone without one that evening hears on the next evening that
// has one, until the occasion.
//
// See supabase/migrations/20261030130000_secret_santa_nudge_and_reminder.sql.
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml } from "../mail.ts";

/** One row of claim_secret_santa_reminders(): one reminder, for one giver. */
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

/** A reminder, ready to go into a digest. */
export type ReminderBlock = { subject: string; html: string; text: string };

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

/** The reminder in `locale` (the digest's). `siteUrl` is where the app runs, for the link. */
export function buildReminder(row: ReminderRow, locale: string, siteUrl: string): ReminderBlock {
  const t = texts[locale === "nl" ? "nl" : "en"];
  const link = `${siteUrl.replace(/\/$/, "")}/lists/${row.recipient_profile_id}`;
  const recipient = escapeHtml(row.recipient_name);
  return {
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
}

/**
 * The reminders due for `giverIds` (whoever gets a digest this evening). Claiming them
 * marks them as sent, so two runs at once don't both send them; hand them back with
 * releaseReminders() when the digest fails. `admin` is a client with the secret key.
 */
export async function claimReminders(
  admin: SupabaseClient,
  giverIds: string[],
): Promise<{ reminders: ReminderRow[]; error?: string }> {
  if (giverIds.length === 0) return { reminders: [] };
  const { data, error } = await admin.rpc("claim_secret_santa_reminders", { givers: giverIds });
  if (error) return { reminders: [], error: `Couldn't collect the reminders: ${error.message}` };
  return { reminders: (data ?? []) as ReminderRow[] };
}

/** Reminders that weren't sent, for the next evening. Returns an error message, if any. */
export async function releaseReminders(
  admin: SupabaseClient,
  reminders: ReminderRow[],
): Promise<string | undefined> {
  if (reminders.length === 0) return undefined;
  const { error } = await admin.rpc("release_secret_santa_reminders", {
    draw_ids: reminders.map((row) => row.secret_santa_id),
    giver_ids: reminders.map((row) => row.giver_profile_id),
  });
  return error ? `Couldn't release the reminders: ${error.message}` : undefined;
}
