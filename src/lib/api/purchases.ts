import { supabase } from "../supabase.ts";
import type { ItemId, OccasionId, ProfileId } from "../ids.ts";
import { today, type IsoDate } from "../occasions.ts";
import { must } from "./must.ts";
import type { Occasion } from "./occasions.ts";

/** bought_by is the buyer's profile id. `occasion` is what it was bought for, if anything. */
export type Purchase = {
  item_id: ItemId;
  bought_by: ProfileId;
  occasion: { name: string } | null;
  /** I ticked that it arrived. Only the buyer's own row is ever returned. */
  delivery: { delivered_at: string } | null;
};

/** Purchases on the given items. The database hides them on your own list. */
export async function getPurchases(itemIds: ItemId[]): Promise<Purchase[]> {
  if (itemIds.length === 0) return [];
  return must(
    await supabase
      .from("purchases")
      .select(
        "item_id, bought_by, occasion:occasions(name), delivery:purchase_deliveries(delivered_at)",
      )
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

/** One thing I bought, for the overview on the settings page (see lib/myPurchases.ts). */
export type MyPurchase = {
  itemId: ItemId;
  name: string;
  url: string | null;
  price: number | null;
  priceCurrency: string | null;
  /** Whose list it's on. */
  listId: ProfileId;
  listName: string;
  /** The list's editors took it off after I bought it. */
  removed: boolean;
  occasion: { id: OccasionId; name: string; date: IsoDate } | null;
  /** I ticked that it arrived. Only I can see this. */
  delivered: boolean;
};

type MyPurchaseRow = {
  item_id: ItemId;
  occasion: { id: OccasionId; name: string; date: IsoDate } | null;
  item: {
    name: string;
    url: string | null;
    price: number | null;
    price_currency: string | null;
    removed_at: string | null;
    profile_id: ProfileId;
    owner: { display_name: string } | null;
  } | null;
  delivery: { delivered_at: string } | null;
};

/**
 * Everything I marked as bought. Items I can no longer see (I left the group, or it
 * was hidden from me) are left out.
 */
export async function getMyPurchases(me: ProfileId): Promise<MyPurchase[]> {
  const rows = must(
    await supabase
      .from("purchases")
      .select(
        "item_id, occasion:occasions(id, name, date), item:items(name, url, price, price_currency, removed_at, profile_id, owner:profiles(display_name)), delivery:purchase_deliveries(delivered_at)",
      )
      .eq("bought_by", me),
  ) as unknown as MyPurchaseRow[];
  return rows.flatMap((row) =>
    row.item
      ? [
          {
            itemId: row.item_id,
            name: row.item.name,
            url: row.item.url,
            price: row.item.price,
            priceCurrency: row.item.price_currency,
            listId: row.item.profile_id,
            listName: row.item.owner?.display_name ?? "",
            removed: row.item.removed_at !== null,
            occasion: row.occasion,
            delivered: row.delivery !== null,
          },
        ]
      : [],
  );
}

/** Ticks or unticks that a purchase of mine arrived. */
export async function setDelivered(itemId: ItemId, delivered: boolean) {
  if (delivered) {
    must(
      await supabase
        .from("purchase_deliveries")
        .upsert({ item_id: itemId }, { onConflict: "item_id", ignoreDuplicates: true }),
    );
  } else {
    must(await supabase.from("purchase_deliveries").delete().eq("item_id", itemId));
  }
}
