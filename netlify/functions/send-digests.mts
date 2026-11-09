/// <reference types="node" />
// Netlify Scheduled Function: every evening, emails everyone who follows a list
// what was added, removed or bought on it since the last run (#27).
//
// The database works out who hears about what (pending_digest()), including who
// may see which item and purchase. This only builds and sends the emails, then
// tells the database it's done (digest_sent()), so the next run starts from here.
//
// Needs VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY and MAIL_FROM.
// Netlify sets URL, the site's address, for the links in the emails.
import { buildDigestEmails, type DigestRow } from "../lib/digest.ts";
import { mailConfigured, sendEmails } from "../lib/mail.ts";
import { sendAllNotices } from "../lib/notices.ts";
import { questionNotices } from "../lib/questionNotices.ts";
import { removalNotices } from "../lib/removalNotices.ts";
import { secretSantaNotices } from "../lib/secret-santa/secretSantaNotices.ts";
import { missingEnv, requireEnv } from "../lib/respond.ts";
import { adminClient } from "../lib/supabase.ts";

export default async () => {
  const read = requireEnv("VITE_SUPABASE_URL", "SUPABASE_SECRET_KEY", "URL");
  if ("missing" in read) throw new Error(`Missing ${read.missing}`);
  const siteUrl = read.env.URL;

  const admin = adminClient(read.env.VITE_SUPABASE_URL, read.env.SUPABASE_SECRET_KEY);
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

    // The emails that normally go out right away (notify-removed, notify-questions,
    // start-secret-santa and notify-secret-santa): this catches what those missed.
    await sendAllNotices([removalNotices, questionNotices, secretSantaNotices], admin, siteUrl);
  } else {
    console.warn(`Digests skipped: missing ${missingEnv("RESEND_API_KEY", "MAIL_FROM")}`);
  }

  const { error } = await admin.rpc("digest_sent", { upto });
  if (error) throw new Error(`Couldn't record the digest: ${error.message}`);
};

// 17:00 UTC: early evening in Belgium (18:00 in winter, 19:00 in summer).
export const config = { schedule: "0 17 * * *" };
