import { supabase } from "../supabase.ts";
import { must } from "./must.ts";

/** A group manager adds a new child. The parent is the manager unless another member is given. */
export async function addChild(
  groupId: string,
  name: string,
  parentProfileId?: string,
): Promise<string> {
  return must(
    await supabase.rpc("add_child_profile", {
      target_group: groupId,
      child_name: name.trim(),
      parent_profile: parentProfileId,
    }),
  ) as string;
}

/** A parent adds their existing child to another group they're in. */
export async function addChildToGroup(groupId: string, childProfileId: string) {
  must(
    await supabase.rpc("add_child_to_group", {
      target_group: groupId,
      child_profile: childProfileId,
    }),
  );
}

export async function addParent(childProfileId: string, parentProfileId: string) {
  must(
    await supabase.rpc("add_profile_manager", {
      child_profile: childProfileId,
      parent_profile: parentProfileId,
    }),
  );
}

/** Remove a parent from a child. A child always keeps at least one parent. */
export async function removeParent(childProfileId: string, parentProfileId: string) {
  must(
    await supabase.rpc("remove_profile_manager", {
      child_profile: childProfileId,
      parent_profile: parentProfileId,
    }),
  );
}

/** Delete a child's profile and wishlist for everyone. */
export async function deleteChild(childProfileId: string) {
  must(await supabase.rpc("delete_child_profile", { child_profile: childProfileId }));
}

/** Parents per child: child profile id → parent profile ids. */
export async function getParents(childProfileIds: string[]): Promise<Map<string, string[]>> {
  const parents = new Map<string, string[]>();
  if (childProfileIds.length === 0) return parents;
  const rows = must(
    await supabase
      .from("profile_managers")
      .select("profile_id, manager_profile_id")
      .in("profile_id", childProfileIds),
  );
  for (const row of rows) {
    parents.set(row.profile_id, [...(parents.get(row.profile_id) ?? []), row.manager_profile_id]);
  }
  return parents;
}
