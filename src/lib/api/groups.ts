import { supabase } from "../supabase.ts";
import { must } from "./must.ts";
import type { Profile } from "./profiles.ts";

export type Role = "manager" | "member";
export type Member = { profile_id: string; role: Role; profiles: Profile };
export type Group = { id: string; name: string; group_members: Member[] };

const memberFields = "profile_id, role, profiles(id, display_name, account_id)";

export async function getMyGroups(): Promise<Group[]> {
  return must(
    await supabase.from("groups").select(`id, name, group_members(${memberFields})`).order("name"),
  ) as unknown as Group[];
}

export async function getGroup(groupId: string): Promise<Group> {
  return must(
    await supabase
      .from("groups")
      .select(`id, name, group_members(${memberFields})`)
      .eq("id", groupId)
      .single(),
  ) as unknown as Group;
}

export async function createGroup(name: string): Promise<string> {
  return must(await supabase.rpc("create_group", { group_name: name.trim() })) as string;
}

export async function renameGroup(groupId: string, name: string) {
  must(await supabase.from("groups").update({ name: name.trim() }).eq("id", groupId).select("id"));
}

export async function deleteGroup(groupId: string) {
  must(await supabase.from("groups").delete().eq("id", groupId));
}

/** "invited" means they have no account yet and join on their first sign-in. */
export type InviteResult = "added" | "invited" | "already_invited" | "already_member";

export async function inviteToGroup(groupId: string, email: string): Promise<InviteResult> {
  return must(
    await supabase.rpc("invite_to_group", { target_group: groupId, invitee_email: email }),
  ) as InviteResult;
}

export async function getInvites(groupId: string): Promise<string[]> {
  const rows = must(
    await supabase.from("group_invites").select("email").eq("group_id", groupId).order("email"),
  );
  return rows.map((row) => row.email as string);
}

/**
 * Emails someone with a pending invite a sign-in link. Sending it creates their
 * account, so they move from the pending invites into the group's members.
 * Runs in a Netlify function because it needs Supabase's secret key.
 */
export async function sendInviteEmail(groupId: string, email: string) {
  const { data } = await supabase.auth.getSession();
  const response = await fetch("/.netlify/functions/send-invite", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupId, email }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Couldn't send the invite email (${response.status})`);
  }
}

export async function cancelInvite(groupId: string, email: string) {
  must(await supabase.from("group_invites").delete().eq("group_id", groupId).eq("email", email));
}

export async function setMemberRole(groupId: string, profileId: string, role: Role) {
  must(
    await supabase
      .from("group_members")
      .update({ role })
      .eq("group_id", groupId)
      .eq("profile_id", profileId)
      .select("profile_id"),
  );
}

/**
 * Leave, or remove someone from, a group. Children left without a parent in the
 * group go too, and the group is deleted once no one with an account is left.
 */
export async function removeMember(
  groupId: string,
  profileId: string,
): Promise<"removed" | "group_deleted"> {
  return must(
    await supabase.rpc("remove_from_group", { target_group: groupId, target_profile: profileId }),
  ) as "removed" | "group_deleted";
}

/** The group's invite link. Anyone signed in who opens it joins the group. Managers only. */
export async function getJoinLink(groupId: string): Promise<string> {
  const code = must(await supabase.rpc("group_join_code", { target_group: groupId })) as string;
  return joinLink(code);
}

/** Makes a new invite link; links shared before stop working. Managers only. */
export async function resetJoinLink(groupId: string): Promise<string> {
  const code = must(
    await supabase.rpc("reset_group_join_code", { target_group: groupId }),
  ) as string;
  return joinLink(code);
}

function joinLink(code: string) {
  return `${window.location.origin}/join/${code}`;
}

export type JoinPreview = { group_id: string; group_name: string; is_member: boolean };

/** The group behind an invite code, or null when the code is wrong or was reset. */
export async function getJoinPreview(code: string): Promise<JoinPreview | null> {
  const rows = must(
    await supabase.rpc("group_for_join_code", { join_code: code }),
  ) as JoinPreview[];
  return rows[0] ?? null;
}

/** Joins the group behind an invite code and returns its id. */
export async function joinGroup(code: string): Promise<string> {
  return must(await supabase.rpc("join_group_by_code", { join_code: code })) as string;
}
