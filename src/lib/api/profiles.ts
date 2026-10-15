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
