import { supabase } from "../supabase.ts";
import type { GroupId, ItemId, ProfileId } from "../ids.ts";
import { must } from "./must.ts";

export type Item = {
  id: ItemId;
  profile_id: ProfileId;
  name: string;
  url: string | null;
  category: string | null;
  visible_in_all_groups: boolean;
  item_groups: { group_id: GroupId }[];
};
export type ItemInput = {
  name: string;
  url: string | null;
  category: string | null;
  visible_in_all_groups: boolean;
  groupIds: GroupId[];
};

export async function getItems(profileId: ProfileId): Promise<Item[]> {
  return must(
    await supabase
      .from("items")
      .select("id, profile_id, name, url, category, visible_in_all_groups, item_groups(group_id)")
      .eq("profile_id", profileId)
      .order("created_at"),
  ) as Item[];
}

export async function getItem(itemId: ItemId): Promise<Item> {
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

async function setItemGroups(itemId: ItemId, input: ItemInput) {
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

export async function addItem(profileId: ProfileId, input: ItemInput) {
  const { id } = must(
    await supabase
      .from("items")
      .insert({ profile_id: profileId, ...itemColumns(input) })
      .select("id")
      .single(),
  ) as { id: ItemId };
  await setItemGroups(id, input);
}

export async function updateItem(itemId: ItemId, input: ItemInput) {
  must(await supabase.from("items").update(itemColumns(input)).eq("id", itemId).select("id"));
  await setItemGroups(itemId, input);
}

export async function deleteItem(itemId: ItemId) {
  must(await supabase.from("items").delete().eq("id", itemId));
}
