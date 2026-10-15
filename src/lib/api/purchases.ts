import { supabase } from "../supabase.ts";
import { must } from "./must.ts";

export type Purchase = { item_id: string; bought_by: string };

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
