/// <reference types="node" />
// Emails about anonymous questions on items (#100), right away: the list's owner
// (or a child's parents) about a new question, the one who asked about the answer.
//
// POST /.netlify/functions/notify-questions with the caller's access token as
// "Authorization: Bearer …". The app calls it after asking or answering; the
// database decides who to mail. Sending is idempotent, so calling it when there's
// nothing to send is fine. The evening digest (send-digests) also sends what's
// left, in case this call failed.
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { createClient } from "@supabase/supabase-js";
import { mailConfigured } from "../lib/mail.ts";
import { sendQuestionNotices } from "../lib/questionNotices.ts";

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
  const { sent, errors } = await sendQuestionNotices(admin, new URL(request.url).origin);
  for (const error of errors) console.error(`Sending question emails failed: ${error}`);
  if (errors.length > 0) return message(502, errors.join("; "));
  return message(200, `sent ${sent}`);
};

function message(status: number, text: string) {
  return Response.json({ message: text }, { status });
}
