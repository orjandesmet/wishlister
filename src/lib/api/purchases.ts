import { supabase } from "../supabase.ts";
import type { ItemId, ProfileId } from "../ids.ts";
import { must } from "./must.ts";

/** bought_by is the buyer's profile id. */
export type Purchase = { item_id: ItemId; bought_by: ProfileId };

/** Purchases on the given items. The database hides them on your own list. */
export async function getPurchases(itemIds: ItemId[]): Promise<Purchase[]> {
  if (itemIds.length === 0) return [];
  return must(await supabase.from("purchases").select("item_id, bought_by").in("item_id", itemIds));
}

export async function markBought(itemId: ItemId) {
  must(await supabase.from("purchases").insert({ item_id: itemId }));
}

export async function undoBought(itemId: ItemId) {
  must(await supabase.from("purchases").delete().eq("item_id", itemId));
}
