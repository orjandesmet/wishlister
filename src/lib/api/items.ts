import { supabase } from "../supabase.ts";
import type { GroupId, ItemId, ProfileId } from "../ids.ts";
import type { PictureRow } from "../itemPictures.ts";
import { must } from "./must.ts";
import type { Price } from "./pageInfo.ts";

export type Item = {
  id: ItemId;
  profile_id: ProfileId;
  name: string;
  url: string | null;
  category: string | null;
  /** Markdown (see lib/markdown.ts), at most 1000 characters. */
  description: string | null;
  visible_in_all_groups: boolean;
  /** A "please don't buy" entry instead of a wish. Nobody can buy it. */
  not_wanted: boolean;
  /** How much the owner wants it. Means nothing on a "please don't buy" entry. */
  want_level: WantLevel;
  item_groups: { group_id: GroupId }[];
  /** Both set or both null. */
  price: number | null;
  price_currency: string | null;
  /** The linked page's picture, shown after the item's own pictures. */
  image_url: string | null;
  /** Up to 5 own pictures: uploaded, or links to pictures. See lib/itemPictures.ts. */
  item_pictures: PictureRow[];
  /**
   * Removed by the list's editors after someone bought it. Only the others see
   * it: the item stays, shown as bought, until the buyer undoes the purchase.
   */
  removed_at: string | null;
};
/** 1 "I want this", 2 "I really want this", 3 "I really, really, REALLY want this". */
export type WantLevel = 1 | 2 | 3;

export type ItemInput = {
  name: string;
  url: string | null;
  category: string | null;
  visible_in_all_groups: boolean;
  not_wanted: boolean;
  /** Left out, the saved level stays as it is. */
  wantLevel?: WantLevel;
  groupIds: GroupId[];
  price: Price | null;
  /** The linked page's picture. Left out, the saved picture stays as it is. */
  imageUrl?: string | null;
  /** Markdown. Left out, the saved description stays as it is. */
  description?: string | null;
};

const ITEM_COLUMNS =
  "id, profile_id, name, url, category, description, visible_in_all_groups, not_wanted, want_level, item_groups(group_id), price, price_currency, image_url, item_pictures(id, path, url, position), removed_at";

export async function getItems(profileId: ProfileId): Promise<Item[]> {
  return must(
    await supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("profile_id", profileId)
      .order("created_at"),
  ) as Item[];
}

export async function getItem(itemId: ItemId): Promise<Item> {
  return must(await supabase.from("items").select(ITEM_COLUMNS).eq("id", itemId).single()) as Item;
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
    price: input.price?.amount ?? null,
    price_currency: input.price?.currency ?? null,
    ...(input.wantLevel !== undefined ? { want_level: input.wantLevel } : {}),
    ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
  };
}

export async function addItem(profileId: ProfileId, input: ItemInput): Promise<ItemId> {
  const { id } = must(
    await supabase
      .from("items")
      .insert({ profile_id: profileId, ...itemColumns(input) })
      .select("id")
      .single(),
  ) as { id: ItemId };
  await setItemGroups(id, input);
  return id;
}

export async function updateItem(itemId: ItemId, input: ItemInput) {
  must(await supabase.from("items").update(itemColumns(input)).eq("id", itemId).select("id"));
  await setItemGroups(itemId, input);
}

/**
 * An item someone already bought isn't deleted but hidden from you (the database
 * decides, so you don't learn it was bought), and its buyer gets an email.
 */
export async function deleteItem(itemId: ItemId) {
  must(await supabase.from("items").delete().eq("id", itemId));
  void notifyBuyers();
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
  /** The linked page's picture. */
  imageUrl?: string | null;
  /** The price found on the linked page. */
  price?: Price | null;
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
        ...(item.price ? { price: item.price.amount, price_currency: item.price.currency } : {}),
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
      .select(ITEM_COLUMNS)
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

/** How much the owner wants an item. */
export async function setWantLevel(itemId: ItemId, level: WantLevel) {
  must(await supabase.from("items").update({ want_level: level }).eq("id", itemId).select("id"));
}

/** Like deleteItem, for several items. */
export async function deleteItems(itemIds: ItemId[]) {
  must(await supabase.from("items").delete().in("id", itemIds));
  void notifyBuyers();
}

/**
 * Emails the buyers of what was just removed. Runs in a Netlify function because
 * it needs Supabase's secret key. Not waited for, and failures only end up in the
 * function's log: the evening digest run sends whatever this missed.
 */
async function notifyBuyers() {
  try {
    const { data } = await supabase.auth.getSession();
    await fetch("/.netlify/functions/notify-removed", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    });
  } catch {
    // Offline, or running without Netlify (vp dev): the digest catches up.
  }
}
