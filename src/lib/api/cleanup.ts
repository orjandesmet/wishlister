import { supabase } from "../supabase.ts";
import type { ItemId, ProfileId } from "../ids.ts";
import { today, type IsoDate } from "../occasions.ts";
import { must } from "./must.ts";

/**
 * An item on this list bought for an occasion that has passed. Only a list's
 * editors get these, and only from the day after the occasion: no spoilers.
 */
export type CleanupItem = {
  item_id: ItemId;
  item_name: string;
  occasion_name: string;
  occasion_date: IsoDate;
};

export async function getPendingCleanup(profileId: ProfileId): Promise<CleanupItem[]> {
  return must(
    await supabase.rpc("pending_cleanup", { target_profile: profileId, on_date: today() }),
  ) as CleanupItem[];
}

/**
 * Every item bought for a passed occasion loses its bought mark; the ones in
 * `removeIds` are deleted for good, pictures and questions included. Nobody is told.
 */
export async function cleanUpBoughtItems(profileId: ProfileId, removeIds: ItemId[]) {
  must(
    await supabase.rpc("clean_up_bought_items", {
      target_profile: profileId,
      remove_ids: removeIds,
      on_date: today(),
    }),
  );
}
