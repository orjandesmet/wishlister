/// <reference types="node" />
// Nudges the person you drew in a Secret Santa (#138): they get an email asking for
// some ideas on their list, without your name.
//
// POST /.netlify/functions/nudge-secret-santa with { recipient: profile id } and the
// giver's access token as "Authorization: Bearer …". The database checks that the
// caller drew this person in a draw that hasn't ended, that their list has fewer
// than 3 items the caller could buy, and that the last nudge is 3 days old
// (claim_secret_santa_nudge()). So nothing here tells the recipient who asked.
//
// Answers 200 when sent; 503 when mail isn't set up; 404 without such a draw; 429
// within 3 days of the last nudge; 409 when the list has enough ideas; 502 when
// sending failed (the nudge can be tried again right away).
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { createClient } from "@supabase/supabase-js";
import { mailConfigured, sendEmail } from "../lib/mail.ts";
import { buildNudgeEmail, type NudgeRow } from "../lib/secret-santa/secretSantaNudge.ts";

export default async (request: Request) => {
  if (request.method !== "POST") return message(405, "Method not allowed");

  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) {
    return message(
      500,
      "Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY",
    );
  }
  if (!mailConfigured()) return message(503, "Sending emails isn't set up yet");

  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return message(401, "Not signed in");
  const body = (await request.json().catch(() => ({}))) as { recipient?: unknown };
  if (typeof body.recipient !== "string") return message(400, "recipient is required");

  const asCaller = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data: user } = await asCaller.auth.getUser(token);
  if (!user.user) return message(401, "Not signed in");

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const { data: giver } = await admin
    .from("profiles")
    .select("id")
    .eq("account_id", user.user.id)
    .maybeSingle();
  if (!giver) return message(401, "Not signed in");

  const { data, error } = await admin.rpc("claim_secret_santa_nudge", {
    giver: giver.id,
    recipient: body.recipient,
  });
  if (error) {
    if (error.hint === "too_soon") return message(429, error.message);
    if (error.hint === "enough_items") return message(409, error.message);
    if (error.code === "P0002") return message(404, error.message);
    console.error(`Claiming the nudge failed: ${error.message}`);
    return message(500, error.message);
  }
  const [row] = (data ?? []) as NudgeRow[];
  // Everyone in a draw has an account, but maybe no email address.
  if (!row?.email) return message(200, "nobody to email");

  const result = await sendEmail(buildNudgeEmail(row, new URL(request.url).origin));
  if (!result.ok) {
    console.error(`Sending the nudge failed: ${result.error}`);
    const { error: releaseError } = await admin.rpc("release_secret_santa_nudge", {
      target_secret_santa: row.secret_santa_id,
      giver: giver.id,
      previous_nudged_at: row.previous_nudged_at,
    });
    if (releaseError) console.error(`Releasing the nudge failed: ${releaseError.message}`);
    return message(502, result.error);
  }
  return message(200, "sent");
};

function message(status: number, text: string) {
  return Response.json({ message: text }, { status });
}
