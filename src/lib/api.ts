import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "./supabase.ts";

export type Profile = { id: string; display_name: string; account_id: string | null };
export type Role = "manager" | "member";
export type Member = { profile_id: string; role: Role; profiles: Profile };
export type Group = { id: string; name: string; group_members: Member[] };
export type Item = {
  id: string;
  profile_id: string;
  name: string;
  url: string | null;
  category: string | null;
  visible_in_all_groups: boolean;
  item_groups: { group_id: string }[];
};
export type ItemInput = {
  name: string;
  url: string | null;
  category: string | null;
  visible_in_all_groups: boolean;
  groupIds: string[];
};
export type Purchase = { item_id: string; bought_by: string };

/** Unwraps a Supabase response, turning its error into a thrown Error. */
function must<T>({ data, error }: { data: T | null; error: PostgrestError | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

const memberFields = "profile_id, role, profiles(id, display_name, account_id)";

// --- Profiles ---------------------------------------------------------------

export async function getMyProfile(accountId: string): Promise<Profile> {
  return must(
    await supabase
      .from("profiles")
      .select("id, display_name, account_id")
      .eq("account_id", accountId)
      .single(),
  );
}

/** Children (profiles without an account) whose lists I manage. */
export async function getManagedProfiles(accountId: string): Promise<Profile[]> {
  const rows = must(
    await supabase
      .from("profile_managers")
      .select("profiles(id, display_name, account_id)")
      .eq("account_id", accountId),
  ) as unknown as { profiles: Profile }[];
  return rows.map((row) => row.profiles);
}

export type ProfileDetails = Profile & {
  managerIds: string[];
  groups: { id: string; name: string }[];
};

export async function getProfileDetails(profileId: string): Promise<ProfileDetails> {
  const row = must(
    await supabase
      .from("profiles")
      .select(
        "id, display_name, account_id, profile_managers(account_id), group_members(groups(id, name))",
      )
      .eq("id", profileId)
      .single(),
  ) as unknown as Profile & {
    profile_managers: { account_id: string }[];
    group_members: { groups: { id: string; name: string } | null }[];
  };
  return {
    id: row.id,
    display_name: row.display_name,
    account_id: row.account_id,
    managerIds: row.profile_managers.map((m) => m.account_id),
    // Only groups I'm also in come back; that's all the visibility picker needs.
    groups: row.group_members.flatMap((m) => (m.groups ? [m.groups] : [])),
  };
}

export async function renameProfile(profileId: string, displayName: string) {
  must(
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", profileId)
      .select("id"),
  );
}

// --- Groups -----------------------------------------------------------------

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

/** Returns "added", "invited" (no account yet) or "already_member". */
export async function inviteToGroup(groupId: string, email: string): Promise<string> {
  return must(
    await supabase.rpc("invite_to_group", { target_group: groupId, invitee_email: email }),
  ) as string;
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

export async function addChild(groupId: string, name: string): Promise<string> {
  return must(
    await supabase.rpc("add_child_profile", { target_group: groupId, child_name: name.trim() }),
  ) as string;
}

export async function addParent(childProfileId: string, parentProfileId: string) {
  must(
    await supabase.rpc("add_profile_manager", {
      child_profile: childProfileId,
      parent_profile: parentProfileId,
    }),
  );
}

/** Parents per child profile in a group: child profile id → parent account ids. */
export async function getParents(childProfileIds: string[]): Promise<Map<string, string[]>> {
  const parents = new Map<string, string[]>();
  if (childProfileIds.length === 0) return parents;
  const rows = must(
    await supabase
      .from("profile_managers")
      .select("profile_id, account_id")
      .in("profile_id", childProfileIds),
  );
  for (const row of rows) {
    parents.set(row.profile_id, [...(parents.get(row.profile_id) ?? []), row.account_id]);
  }
  return parents;
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

// --- Items ------------------------------------------------------------------

export async function getItems(profileId: string): Promise<Item[]> {
  return must(
    await supabase
      .from("items")
      .select("id, profile_id, name, url, category, visible_in_all_groups, item_groups(group_id)")
      .eq("profile_id", profileId)
      .order("created_at"),
  ) as Item[];
}

export async function getItem(itemId: string): Promise<Item> {
  return must(
    await supabase
      .from("items")
      .select("id, profile_id, name, url, category, visible_in_all_groups, item_groups(group_id)")
      .eq("id", itemId)
      .single(),
  ) as Item;
}

/** Categories used on any list I can see, for the suggestions under the category field. */
export async function getCategories(): Promise<string[]> {
  const rows = must(await supabase.from("items").select("category").not("category", "is", null));
  return [...new Set(rows.map((row) => (row.category as string).trim()))].sort();
}

async function setItemGroups(itemId: string, input: ItemInput) {
  must(await supabase.from("item_groups").delete().eq("item_id", itemId));
  if (input.visible_in_all_groups || input.groupIds.length === 0) return;
  must(
    await supabase
      .from("item_groups")
      .insert(input.groupIds.map((groupId) => ({ item_id: itemId, group_id: groupId }))),
  );
}

function itemColumns(input: ItemInput) {
  return {
    name: input.name.trim(),
    url: input.url?.trim() || null,
    category: input.category?.trim() || null,
    visible_in_all_groups: input.visible_in_all_groups,
  };
}

export async function addItem(profileId: string, input: ItemInput) {
  const { id } = must(
    await supabase
      .from("items")
      .insert({ profile_id: profileId, ...itemColumns(input) })
      .select("id")
      .single(),
  ) as { id: string };
  await setItemGroups(id, input);
}

export async function updateItem(itemId: string, input: ItemInput) {
  must(await supabase.from("items").update(itemColumns(input)).eq("id", itemId).select("id"));
  await setItemGroups(itemId, input);
}

export async function deleteItem(itemId: string) {
  must(await supabase.from("items").delete().eq("id", itemId));
}

// --- Purchases --------------------------------------------------------------

/** Purchases on the given items. The database hides them on your own list. */
export async function getPurchases(itemIds: string[]): Promise<Purchase[]> {
  if (itemIds.length === 0) return [];
  return must(await supabase.from("purchases").select("item_id, bought_by").in("item_id", itemIds));
}

export async function markBought(itemId: string) {
  must(await supabase.from("purchases").insert({ item_id: itemId }));
}

export async function undoBought(itemId: string) {
  must(await supabase.from("purchases").delete().eq("item_id", itemId));
}
