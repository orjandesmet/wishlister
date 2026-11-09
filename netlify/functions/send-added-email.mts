/// <reference types="node" />
// Emails someone who already has an account that a group manager added them to
// a group (#30). People without an account get send-invite instead.
//
// POST /.netlify/functions/send-added-email with { groupId, email } and the
// manager's access token as "Authorization: Bearer …".
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { buildAddedEmail } from "../lib/addedEmail.ts";
import { mailConfigured, sendEmail } from "../lib/mail.ts";
import { message, missingEnv } from "../lib/respond.ts";
import {
  adminClient,
  readSupabaseKeys,
  signedInCaller,
  SUPABASE_KEY_NAMES,
} from "../lib/supabase.ts";

type Member = { role: string; profiles: { account_id: string | null; display_name: string } };

export default async (request: Request) => {
  if (request.method !== "POST") return message(405, "Method not allowed");

  const read = readSupabaseKeys();
  if ("missing" in read || !mailConfigured()) {
    // Not an error for the manager: the member is in the group either way.
    return message(
      503,
      "Sending emails isn't set up yet.",
      `missing ${missingEnv(...SUPABASE_KEY_NAMES, "RESEND_API_KEY", "MAIL_FROM")}`,
    );
  }

  const { keys } = read;

  const { groupId, email } = (await request.json().catch(() => ({}))) as {
    groupId?: string;
    email?: string;
  };
  if (!groupId || !email) return message(400, "groupId and email are required");

  // The group is read as the manager (asCaller), so row-level security applies:
  // they only see groups they're in.
  const signedIn = await signedInCaller(request, keys);
  if ("response" in signedIn) return signedIn.response;
  const { user, asCaller } = signedIn;

  const { data: group, error: groupError } = await asCaller
    .from("groups")
    .select("name, group_members(role, profiles(account_id, display_name))")
    .eq("id", groupId)
    .maybeSingle();
  const members = (group?.group_members ?? []) as unknown as Member[];
  const caller = members.find((m) => m.profiles.account_id === user.id);
  if (!group || caller?.role !== "manager") {
    return message(
      403,
      "Only group managers can email new members",
      group
        ? `account ${user.id} is ${caller?.role ?? "not a member"} in group ${groupId}`
        : `group ${groupId} not visible to account ${user.id}: ${groupError?.message ?? "no row"}`,
    );
  }

  // Only someone who is in the group gets the email, so this can't be used to
  // email any address. Groups are small, so looking up each account is fine.
  const admin = adminClient(keys.url, keys.secretKey);
  const normalized = email.trim().toLowerCase();
  const accounts = await Promise.all(
    members
      .filter((m) => m.profiles.account_id && m !== caller)
      .map((m) => admin.auth.admin.getUserById(m.profiles.account_id!)),
  );
  for (const { error } of accounts) {
    if (error) console.warn(`Looking up a member's account failed: ${error.message}`);
  }
  const recipient = accounts
    .map((result) => result.data.user)
    .find((account) => account?.email?.toLowerCase() === normalized);
  if (!recipient?.email) {
    return message(
      404,
      "That email isn't a member of this group",
      `checked ${accounts.length} accounts in group ${groupId}`,
    );
  }

  const result = await sendEmail(
    buildAddedEmail({
      to: recipient.email,
      locale: String(recipient.user_metadata.locale ?? "en"),
      group: group.name as string,
      addedBy: caller.profiles.display_name,
      groupUrl: `${new URL(request.url).origin}/groups/${groupId}`,
    }),
  );
  if (!result.ok) return message(502, result.error, "sending the email failed");
  return message(200, "sent");
};
