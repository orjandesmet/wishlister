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
import { sendSecretSantaNotices } from "../lib/secretSantaNotices.ts";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) {
    return message(
      500,
      "Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY",
    );
  }
  if (!mailConfigured()) return message(200, "mail isn't set up");

  // Only signed-in people can make it run.
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return message(401, "Not signed in");
  const asCaller = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data: user } = await asCaller.auth.getUser(token);
  if (!user.user) return message(401, "Not signed in");

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const { sent, errors } = await sendSecretSantaNotices(admin, new URL(request.url).origin);
  for (const error of errors) console.error(`Sending Secret Santa emails failed: ${error}`);
  if (errors.length > 0) return message(502, errors.join("; "));
  return message(200, `sent ${sent}`);
};

function message(status: number, text: string) {
  return Response.json({ message: text }, { status });
}
