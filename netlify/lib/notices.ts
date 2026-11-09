/// <reference types="node" />
// What the "right away" emails share (removal notices, question emails, Secret Santa
// draws): each kind claims its rows in the database, mails them, and hands them back
// when sending failed. The notify-* functions send one kind as soon as the app asks;
// the evening digest (send-digests) sends what's left of every kind.
import type { SupabaseClient } from "@supabase/supabase-js";
import { mailConfigured, sendEmails, type Email } from "./mail.ts";
import { message, missingEnv } from "./respond.ts";
import { adminClient, signedInCaller, supabaseKeys } from "./supabase.ts";

/** Mails everyone who hasn't heard yet. `admin` is a client with the secret key. */
export type NoticeSender = (
  admin: SupabaseClient,
  siteUrl: string,
) => Promise<{ sent: number; errors: string[] }>;

/** One kind of notice: how it's sent, and what it's called in the log ("removal notices"). */
export type NoticeKind = { what: string; send: NoticeSender };

/**
 * Mails every row the database hands out. Claiming the rows marks them as mailed, so
 * two runs at once don't both send; a failed send hands them back for the next run.
 */
export async function sendClaimedNotices<Row>(
  admin: SupabaseClient,
  notices: {
    /** The database function that claims the rows. */
    claim: string;
    /** What the rows are, for the error when claiming fails ("removed items"). */
    rows: string;
    build: (rows: Row[]) => Email[];
    /** The database function, and its arguments, that hands these rows back. */
    release: (rows: Row[]) => [name: string, args: Record<string, unknown>];
  },
): Promise<{ sent: number; errors: string[] }> {
  const { data, error } = await admin.rpc(notices.claim);
  if (error) return { sent: 0, errors: [`Couldn't collect ${notices.rows}: ${error.message}`] };
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return { sent: 0, errors: [] };

  const result = await sendEmails(notices.build(rows));
  if (result.errors.length > 0) {
    // Which emails of a failed batch went out isn't known; with fewer than 100
    // (one batch), nothing did.
    const { error: releaseError } = await admin.rpc(...notices.release(rows));
    if (releaseError) result.errors.push(`Couldn't release them: ${releaseError.message}`);
  }
  return result;
}

/**
 * A Netlify function that sends one kind of notice when a signed-in person asks
 * (POST, with their access token as "Authorization: Bearer …"). The database decides
 * who is mailed, and sending is idempotent, so calling it when there's nothing to send
 * is fine.
 */
export function noticeHandler({ what, send }: NoticeKind) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return message(405, "Method not allowed");

    const setup = supabaseKeys();
    if ("response" in setup) return setup.response;
    const { url, secretKey } = setup.keys;
    if (!mailConfigured()) {
      console.warn(`Nothing sent: missing ${missingEnv("RESEND_API_KEY", "MAIL_FROM")}`);
      return message(200, "mail isn't set up");
    }

    // Only signed-in people can make it run.
    const signedIn = await signedInCaller(request, setup.keys);
    if ("response" in signedIn) return signedIn.response;

    const admin = adminClient(url, secretKey);
    const { sent, errors } = await send(admin, new URL(request.url).origin);
    if (errors.length > 0) {
      return message(502, errors.join("; "), `sending ${what} failed, ${sent} sent`);
    }
    return message(200, `sent ${sent}`);
  };
}

/** Sends what's left of each kind, logging how it went. A failed kind doesn't stop the others. */
export async function sendAllNotices(
  kinds: NoticeKind[],
  admin: SupabaseClient,
  siteUrl: string,
): Promise<void> {
  for (const { what, send } of kinds) {
    const { sent, errors } = await send(admin, siteUrl);
    if (sent > 0) console.log(`${what[0].toUpperCase()}${what.slice(1)} sent: ${sent}`);
    for (const failure of errors) console.error(`Sending ${what} failed: ${failure}`);
  }
}
