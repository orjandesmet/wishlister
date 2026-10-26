/// <reference types="node" />
// Emails someone who already has an account that a group manager added them to
// a group (#30). People without an account get send-invite instead.
//
// POST /.netlify/functions/send-added-email with { groupId, email } and the
// manager's access token as "Authorization: Bearer …".
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { createClient } from "@supabase/supabase-js";
import { buildAddedEmail } from "../lib/addedEmail.ts";
import { mailConfigured, sendEmail } from "../lib/mail.ts";

type Member = { role: string; profiles: { account_id: string | null; display_name: string } };

export default async (request: Request) => {
  if (request.method !== "POST") return message(405, "Method not allowed");

  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey || !mailConfigured()) {
    // Not an error for the manager: the member is in the group either way.
    return message(503, "Sending emails isn't set up yet.");
  }

  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return message(401, "Not signed in");

  const { groupId, email } = (await request.json().catch(() => ({}))) as {
    groupId?: string;
    email?: string;
  };
  if (!groupId || !email) return message(400, "groupId and email are required");

  // The group is read as the manager, so row-level security applies: they only
  // see groups they're in.
  const asCaller = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: user } = await asCaller.auth.getUser(token);
  if (!user.user) return message(401, "Not signed in");

  const { data: group } = await asCaller
    .from("groups")
    .select("name, group_members(role, profiles(account_id, display_name))")
    .eq("id", groupId)
    .maybeSingle();
  const members = (group?.group_members ?? []) as unknown as Member[];
  const caller = members.find((m) => m.profiles.account_id === user.user.id);
  if (!group || caller?.role !== "manager") {
    return message(403, "Only group managers can email new members");
  }

  // Only someone who is in the group gets the email, so this can't be used to
  // email any address. Groups are small, so looking up each account is fine.
  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const normalized = email.trim().toLowerCase();
  const accounts = await Promise.all(
    members
      .filter((m) => m.profiles.account_id && m !== caller)
      .map((m) => admin.auth.admin.getUserById(m.profiles.account_id!)),
  );
  const recipient = accounts
    .map((result) => result.data.user)
    .find((account) => account?.email?.toLowerCase() === normalized);
  if (!recipient?.email) return message(404, "That email isn't a member of this group");

  const result = await sendEmail(
    buildAddedEmail({
      to: recipient.email,
      locale: String(recipient.user_metadata.locale ?? "en"),
      group: group.name as string,
      addedBy: caller.profiles.display_name,
      groupUrl: `${new URL(request.url).origin}/groups/${groupId}`,
    }),
  );
  if (!result.ok) return message(502, result.error);
  return message(200, "sent");
};

function message(status: number, text: string) {
  return Response.json({ message: text }, { status });
}
