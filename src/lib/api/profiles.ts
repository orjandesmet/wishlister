import { supabase } from "../supabase.ts";
import { must } from "./must.ts";

export type Profile = { id: string; display_name: string; account_id: string | null };

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
export async function getManagedProfiles(myProfileId: string): Promise<Profile[]> {
  const rows = must(
    await supabase
      .from("profile_managers")
      // profile_managers links to profiles twice (child and parent), so name the link to follow.
      .select("profiles!profile_managers_profile_id_fkey(id, display_name, account_id)")
      .eq("manager_profile_id", myProfileId),
  ) as unknown as { profiles: Profile }[];
  return rows
    .map((row) => row.profiles)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export type ProfileDetails = Profile & {
  /** Profile ids of the parents, for a child's profile. */
  managerIds: string[];
  groups: { id: string; name: string }[];
};

export async function getProfileDetails(profileId: string): Promise<ProfileDetails> {
  const row = must(
    await supabase
      .from("profiles")
      .select(
        "id, display_name, account_id, profile_managers!profile_managers_profile_id_fkey(manager_profile_id), group_members(groups(id, name))",
      )
      .eq("id", profileId)
      .single(),
  ) as unknown as Profile & {
    profile_managers: { manager_profile_id: string }[];
    group_members: { groups: { id: string; name: string } | null }[];
  };
  return {
    id: row.id,
    display_name: row.display_name,
    account_id: row.account_id,
    managerIds: row.profile_managers.map((m) => m.manager_profile_id),
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
