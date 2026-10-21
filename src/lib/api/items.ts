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
  /** A "please don't buy" entry instead of a wish. Nobody can buy it. */
  not_wanted: boolean;
  item_groups: { group_id: GroupId }[];
};
export type ItemInput = {
  name: string;
  url: string | null;
  category: string | null;
  visible_in_all_groups: boolean;
  not_wanted: boolean;
  groupIds: GroupId[];
};

const itemSelect =
  "id, profile_id, name, url, category, visible_in_all_groups, not_wanted, item_groups(group_id)";

export async function getItems(profileId: ProfileId): Promise<Item[]> {
  return must(
    await supabase.from("items").select(itemSelect).eq("profile_id", profileId).order("created_at"),
  ) as Item[];
}

export async function getItem(itemId: ItemId): Promise<Item> {
  return must(await supabase.from("items").select(itemSelect).eq("id", itemId).single()) as Item;
}

/**
 * The category of every item I can see, duplicates included, so the suggestions
 * under the category field can rank them by use (see suggestCategories).
 */
export async function getCategories(): Promise<string[]> {
  const rows = must(await supabase.from("items").select("category").not("category", "is", null));
  return rows.map((row) => row.category as string);
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
    not_wanted: input.not_wanted,
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

/** Which groups see an item: all of them, or only these (none at all when empty). */
export type GroupSelection = "all" | GroupId[];

export type QuickItem = {
  id: ItemId;
  name: string;
  groups: GroupSelection;
  url?: string | null;
  /** Typed with a leading "!": a "please don't buy" entry. */
  notWanted?: boolean;
  /** The linked page's picture, stored for later (not shown yet). */
  imageUrl?: string | null;
};

/**
 * Adds several items in one insert, then their groups in one more. The ids are
 * made by the caller and duplicates are skipped, so retrying a batch that half
 * worked doesn't add anything twice. Returns the items in the order given.
 */
export async function addQuickItems(profileId: ProfileId, items: QuickItem[]): Promise<Item[]> {
  must(
    await supabase.from("items").upsert(
      items.map((item) => ({
        id: item.id,
        profile_id: profileId,
        name: item.name.trim(),
        url: item.url ?? null,
        // Only sent when there is one, so lists without links don't depend on the column.
        ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
        visible_in_all_groups: item.groups === "all",
        not_wanted: item.notWanted ?? false,
      })),
      { onConflict: "id", ignoreDuplicates: true },
    ),
  );
  const links = items.flatMap((item) =>
    item.groups === "all"
      ? []
      : item.groups.map((groupId) => ({ item_id: item.id, group_id: groupId })),
  );
  if (links.length > 0) {
    must(
      await supabase
        .from("item_groups")
        .upsert(links, { onConflict: "item_id,group_id", ignoreDuplicates: true }),
    );
  }
  const saved = must(
    await supabase
      .from("items")
      .select(itemSelect)
      .in(
        "id",
        items.map((item) => item.id),
      ),
  ) as Item[];
  const order = new Map(items.map((item, index) => [item.id, index]));
  return saved.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

/** Gives all these items the same category; null or blank clears it. */
export async function setItemsCategory(itemIds: ItemId[], category: string | null) {
  must(
    await supabase
      .from("items")
      .update({ category: category?.trim() || null })
      .in("id", itemIds)
      .select("id"),
  );
}

/** Makes all these items visible in the same groups, replacing what each had. */
export async function setItemsGroups(itemIds: ItemId[], groups: GroupSelection) {
  must(
    await supabase
      .from("items")
      .update({ visible_in_all_groups: groups === "all" })
      .in("id", itemIds)
      .select("id"),
  );
  must(await supabase.from("item_groups").delete().in("item_id", itemIds));
  if (groups === "all" || groups.length === 0) return;
  must(
    await supabase
      .from("item_groups")
      .insert(
        itemIds.flatMap((itemId) =>
          groups.map((groupId) => ({ item_id: itemId, group_id: groupId })),
        ),
      ),
  );
}

export async function deleteItems(itemIds: ItemId[]) {
  must(await supabase.from("items").delete().in("id", itemIds));
}
