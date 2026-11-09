/// <reference types="node" />
// Emails buyers right away when the list's owner removed something they bought
// (#89), so they can still cancel their order.
//
// POST /.netlify/functions/notify-removed with the caller's access token as
// "Authorization: Bearer …". The app calls it after every removal: the owner
// can't know whether anything was bought, and the database decides who to mail.
// Sending is idempotent, so calling it when there's nothing to send is fine. The
// evening digest (send-digests) also sends what's left, in case this call failed.
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { mailConfigured } from "../lib/mail.ts";
import { sendRemovalNotices } from "../lib/removalNotices.ts";
import { message, missingEnv } from "../lib/respond.ts";
import { adminClient, signedInCaller, supabaseKeys } from "../lib/supabase.ts";

export default async (request: Request) => {
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
  const { sent, errors } = await sendRemovalNotices(admin, new URL(request.url).origin);
  if (errors.length > 0) {
    return message(502, errors.join("; "), `sending removal notices failed, ${sent} sent`);
  }
  return message(200, `sent ${sent}`);
};
