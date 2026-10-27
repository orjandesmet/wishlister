/// <reference types="node" />
// Runs a Secret Santa draw for a group occasion (#102) and emails everyone who
// takes part who they drew.
//
// POST /.netlify/functions/start-secret-santa with
// { occasionId, participants: profile ids, exclusions: [{ profile, excluded }] } and
// the manager's access token as "Authorization: Bearer …".
//
// The draw runs here (see ../lib/secretSanta.ts) and goes to the database through
// create_secret_santa(), which only works with the secret key. So the full result
// is never handed to a client: the response says nothing about who drew whom.
//
// The draw is made even when mail isn't set up or fails; the response says how the
// emails went in `mail` ("sent", "not_set_up" or "failed"). What wasn't mailed goes
// out later (notify-secret-santa and the evening digest).
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY,
// and for the emails RESEND_API_KEY and MAIL_FROM.
import { createClient } from "@supabase/supabase-js";
import { mailConfigured } from "../lib/mail.ts";
import { draw, type Exclusion, type Pair } from "../lib/secretSanta.ts";
import { sendSecretSantaNotices } from "../lib/secretSantaNotices.ts";

type Candidate = { profile_id: string; display_name: string };
type HistoryRow = { draw_rank: number; giver_profile_id: string; recipient_profile_id: string };

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

  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return message(401, "Not signed in");

  const body = (await request.json().catch(() => ({}))) as {
    occasionId?: string;
    participants?: string[];
    exclusions?: Exclusion[];
  };
  const { occasionId } = body;
  if (!occasionId || !Array.isArray(body.participants)) {
    return message(400, "occasionId and participants are required");
  }
  const participants = [...new Set(body.participants.map(String))];
  const exclusions = (Array.isArray(body.exclusions) ? body.exclusions : [])
    .filter((e) => e && typeof e.profile === "string" && typeof e.excluded === "string")
    .map((e) => ({ profile: e.profile, excluded: e.excluded }));

  // Everything about the caller is read as them, so row-level security applies.
  const asCaller = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: user } = await asCaller.auth.getUser(token);
  if (!user.user) return message(401, "Not signed in");

  const { data: occasion } = await asCaller
    .from("occasions")
    .select("id, group_id")
    .eq("id", occasionId)
    .maybeSingle();
  if (!occasion) return message(404, "Occasion not found");
  const groupId = occasion.group_id as string;

  const { data: membership } = await asCaller
    .from("group_members")
    .select("profile_id, role, profiles!inner(account_id)")
    .eq("group_id", groupId)
    .eq("profiles.account_id", user.user.id)
    .maybeSingle();
  if (membership?.role !== "manager") {
    return message(403, "Only group managers can start a Secret Santa");
  }

  // Only members with their own list can take part: no children, no guardians.
  const { data: candidates, error: candidatesError } = await asCaller.rpc(
    "secret_santa_candidates",
    { target_group: groupId },
  );
  if (candidatesError) return message(500, candidatesError.message);
  const names = new Map((candidates as Candidate[]).map((c) => [c.profile_id, c.display_name]));
  if (!participants.every((id) => names.has(id))) {
    return message(400, "Only members with their own list can take part");
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const { data: historyRows, error: historyError } = await admin.rpc("secret_santa_history", {
    target_group: groupId,
  });
  if (historyError) return message(500, historyError.message);
  const history: Pair[][] = [[], []];
  for (const row of (historyRows ?? []) as HistoryRow[]) {
    history[row.draw_rank - 1]?.push({
      giver: row.giver_profile_id,
      recipient: row.recipient_profile_id,
    });
  }

  const result = draw({ participants, exclusions, history: history.filter((d) => d.length > 0) });
  if (!result.ok) {
    if (result.reason.kind === "too_few_participants") {
      return message(422, "A Secret Santa needs at least 2 participants");
    }
    const name = names.get(result.reason.profile) ?? "someone";
    return message(
      422,
      `No draw is possible: too many exclusions for ${name}. Remove some exclusions and try again.`,
    );
  }

  const { error } = await admin.rpc("create_secret_santa", {
    manager: membership.profile_id,
    target_occasion: occasionId,
    participants,
    exclusions: exclusions.map((e) => ({ profile_id: e.profile, excluded_profile_id: e.excluded })),
    pairs: result.pairs,
  });
  if (error) {
    if (error.code === "23505") return message(409, error.message);
    if (error.code === "23514") return message(422, error.message);
    console.error(`Saving the Secret Santa failed: ${error.message}`);
    return message(500, error.message);
  }

  if (!mailConfigured()) return mailed("not_set_up");
  const { errors } = await sendSecretSantaNotices(admin, new URL(request.url).origin);
  for (const failure of errors) console.error(`Sending Secret Santa emails failed: ${failure}`);
  return mailed(errors.length > 0 ? "failed" : "sent");
};

function mailed(mail: "sent" | "not_set_up" | "failed") {
  return Response.json({ message: "drawn", mail });
}

function message(status: number, text: string) {
  return Response.json({ message: text }, { status });
}
