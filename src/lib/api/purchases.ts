import { supabase } from "../supabase.ts";
import type { ItemId, OccasionId, ProfileId } from "../ids.ts";
import { today } from "../occasions.ts";
import { must } from "./must.ts";
import type { Occasion } from "./occasions.ts";

/** bought_by is the buyer's profile id. `occasion` is what it was bought for, if anything. */
export type Purchase = {
  item_id: ItemId;
  bought_by: ProfileId;
  occasion: { name: string } | null;
};

/** Purchases on the given items. The database hides them on your own list. */
export async function getPurchases(itemIds: ItemId[]): Promise<Purchase[]> {
  if (itemIds.length === 0) return [];
  return must(
    await supabase
      .from("purchases")
      .select("item_id, bought_by, occasion:occasions(name)")
      .in("item_id", itemIds),
  ) as unknown as Purchase[];
}

/**
 * The occasions you can buy this item for, soonest first: upcoming occasions of
 * the groups where you see it.
 */
export async function getPurchaseOccasions(itemId: ItemId): Promise<Occasion[]> {
  return must(
    await supabase.rpc("purchase_occasions", { target_item: itemId, from_date: today() }),
  ) as Occasion[];
}

/** Also follows the list until the occasion (the database does that). */
export async function markBought(itemId: ItemId, occasionId: OccasionId | null) {
  must(await supabase.from("purchases").insert({ item_id: itemId, occasion_id: occasionId }));
}

export async function undoBought(itemId: ItemId) {
  must(await supabase.from("purchases").delete().eq("item_id", itemId));
}
