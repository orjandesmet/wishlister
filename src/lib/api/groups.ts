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

export async function removeMember(groupId: string, profileId: string) {
  must(
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("profile_id", profileId),
  );
}
