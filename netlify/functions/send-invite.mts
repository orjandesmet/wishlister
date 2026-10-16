/// <reference types="node" />
// Emails someone a group manager invited who has no account yet.
//
// POST /.netlify/functions/send-invite with { groupId, email } and the manager's
// access token as "Authorization: Bearer …". The email itself is Supabase's
// "Invite user" auth email, so it goes out through the same sender as login emails.
//
// Sending it creates their account straight away, and the handle_new_account
// trigger turns the pending invite into a membership: they're in the group from
// now on, and the link in the email signs them in.
import { createClient } from "@supabase/supabase-js";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) {
    return message(500, "Sending invite emails isn't set up yet (missing SUPABASE_SECRET_KEY).");
  }

  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return message(401, "Not signed in");

  const { groupId, email } = (await request.json().catch(() => ({}))) as {
    groupId?: string;
    email?: string;
  };
  if (!groupId || !email) return message(400, "groupId and email are required");

  // Everything is checked as the manager, so row-level security applies: only a
  // manager of the group can see its pending invites.
  const asCaller = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: user } = await asCaller.auth.getUser(token);
  if (!user.user) return message(401, "Not signed in");

  const normalized = email.trim().toLowerCase();
  const { data: invite } = await asCaller
    .from("group_invites")
    .select("email, groups(name)")
    .eq("group_id", groupId)
    .eq("email", normalized)
    .maybeSingle();
  if (!invite) return message(404, "There's no pending invite for this email in your group");

  const { data: inviter } = await asCaller
    .from("profiles")
    .select("display_name")
    .eq("account_id", user.user.id)
    .maybeSingle();

  const groupName = (invite.groups as unknown as { name: string } | null)?.name ?? "a group";
  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.inviteUserByEmail(normalized, {
    // Available in the email template as {{ .Data.group_name }} and {{ .Data.invited_by }}.
    data: { group_name: groupName, invited_by: inviter?.display_name ?? "Someone" },
    redirectTo: new URL(request.url).origin,
  });
  if (error) return message(502, error.message);

  return message(200, "sent");
};

function message(status: number, text: string) {
  return Response.json({ message: text }, { status });
}
