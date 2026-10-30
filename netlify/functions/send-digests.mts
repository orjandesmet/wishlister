/// <reference types="node" />
// Netlify Scheduled Function: every evening, emails everyone who follows a list
// what was added, removed or bought on it since the last run (#27), and sends
// the other emails that wait for it (see below).
//
// The database works out who hears about what (pending_digest()), including who
// may see which item and purchase. This only builds and sends the emails, then
// tells the database it's done (digest_sent()), so the next run starts from here.
//
// Needs VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY and MAIL_FROM.
// Netlify sets URL, the site's address, for the links in the emails.
import { createClient } from "@supabase/supabase-js";
import { buildDigestEmails, type DigestRow } from "../lib/digest.ts";
import { mailConfigured, sendEmails } from "../lib/mail.ts";
import { sendQuestionNotices } from "../lib/questionNotices.ts";
import { sendRemovalNotices } from "../lib/removalNotices.ts";
import { sendSecretSantaNotices } from "../lib/secret-santa/secretSantaNotices.ts";
import { sendSecretSantaReminders } from "../lib/secret-santa/secretSantaReminders.ts";

export default async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const siteUrl = process.env.URL;
  if (!url || !secretKey || !siteUrl) {
    throw new Error("Missing VITE_SUPABASE_URL, SUPABASE_SECRET_KEY or URL");
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const upto = new Date().toISOString();

  // Without a mail setup there's nothing to send, but the window still moves on:
  // otherwise the first digest after setting up Resend would hold weeks of changes.
  if (mailConfigured()) {
    const { data, error } = await admin.rpc("pending_digest", { upto });
    if (error) throw new Error(`Couldn't collect the changes: ${error.message}`);

    const emails = buildDigestEmails(data as DigestRow[], siteUrl);
    const { sent, errors } = await sendEmails(emails);
    console.log(`Digests sent: ${sent} of ${emails.length}`);
    // A failed batch isn't retried tomorrow: those changes would arrive a day late
    // and next to newer ones. The error is in the function log.
    for (const message of errors) console.error(`Sending digests failed: ${message}`);

    // Buyers of removed items normally hear right away (notify-removed); this
    // catches what that missed.
    const notices = await sendRemovalNotices(admin, siteUrl);
    if (notices.sent > 0) console.log(`Removal notices sent: ${notices.sent}`);
    for (const message of notices.errors) {
      console.error(`Sending removal notices failed: ${message}`);
    }

    // The same for questions and answers on items (notify-questions).
    const questions = await sendQuestionNotices(admin, siteUrl);
    if (questions.sent > 0) console.log(`Question emails sent: ${questions.sent}`);
    for (const message of questions.errors) {
      console.error(`Sending question emails failed: ${message}`);
    }

    // And for Secret Santa draws (start-secret-santa, notify-secret-santa).
    const santas = await sendSecretSantaNotices(admin, siteUrl);
    if (santas.sent > 0) console.log(`Secret Santa emails sent: ${santas.sent}`);
    for (const message of santas.errors) {
      console.error(`Sending Secret Santa emails failed: ${message}`);
    }

    // Everyone in a draw hears once more, a week before the occasion (#139).
    const reminders = await sendSecretSantaReminders(admin, siteUrl);
    if (reminders.sent > 0) console.log(`Secret Santa reminders sent: ${reminders.sent}`);
    for (const message of reminders.errors) {
      console.error(`Sending Secret Santa reminders failed: ${message}`);
    }
  } else {
    console.warn("Digests skipped: RESEND_API_KEY or MAIL_FROM isn't set.");
  }

  const { error } = await admin.rpc("digest_sent", { upto });
  if (error) throw new Error(`Couldn't record the digest: ${error.message}`);
};

// 17:00 UTC: early evening in Belgium (18:00 in winter, 19:00 in summer).
export const config = { schedule: "0 17 * * *" };
