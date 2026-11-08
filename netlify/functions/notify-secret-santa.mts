/// <reference types="node" />
// Emails who someone drew in a Secret Santa (#102), right away: the givers who
// haven't heard yet. The app calls it after a manager removed someone from a draw,
// which gives the person who drew them a new person (start-secret-santa mails the
// first draw itself).
//
// POST /.netlify/functions/notify-secret-santa with the caller's access token as
// "Authorization: Bearer …". The database decides who is mailed. Sending is
// idempotent, so calling it when there's nothing to send is fine. The evening digest
// (send-digests) also sends what's left, in case this call failed.
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { createClient } from "@supabase/supabase-js";
import { mailConfigured } from "../lib/mail.ts";
import { sendSecretSantaNotices } from "../lib/secret-santa/secretSantaNotices.ts";
import { bearerToken, message, missingEnv, signedInUser } from "../lib/respond.ts";

export default async (request: Request) => {
  if (request.method !== "POST") return message(405, "Method not allowed");

  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) {
    return message(
      500,
      "Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY",
      `missing ${missingEnv("VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY")}`,
    );
  }
  if (!mailConfigured()) {
    console.warn(`Nothing sent: missing ${missingEnv("RESEND_API_KEY", "MAIL_FROM")}`);
    return message(200, "mail isn't set up");
  }

  // Only signed-in people can make it run.
  const token = bearerToken(request);
  if (!token) return message(401, "Not signed in", "no Authorization header");
  const asCaller = createClient(url, publishableKey, { auth: { persistSession: false } });
  const signedIn = await signedInUser(asCaller, token);
  if ("response" in signedIn) return signedIn.response;

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const { sent, errors } = await sendSecretSantaNotices(admin, new URL(request.url).origin);
  if (errors.length > 0) {
    return message(502, errors.join("; "), `sending Secret Santa emails failed, ${sent} sent`);
  }
  return message(200, `sent ${sent}`);
};
