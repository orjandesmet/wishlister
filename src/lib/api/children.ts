import { supabase } from "../supabase.ts";
import { must } from "./must.ts";

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
