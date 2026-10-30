import { supabase } from "../supabase.ts";
import type { ItemId, OccasionId, ProfileId } from "../ids.ts";
import { today, type IsoDate } from "../occasions.ts";
import { must } from "./must.ts";

/**
 * A passed occasion with items on this list bought for it. Only a list's editors
 * get these, and only from the day after the occasion: no spoilers.
 */
export type PendingCleanup = {
  occasion_id: OccasionId;
  occasion_name: string;
  occasion_date: IsoDate;
  item_count: number;
};

export async function getPendingCleanups(profileId: ProfileId): Promise<PendingCleanup[]> {
  return must(
    await supabase.rpc("pending_cleanups", { target_profile: profileId, on_date: today() }),
  ) as PendingCleanup[];
}

/**
 * Archives the items bought for these occasions; items kept on the list only lose
 * their bought mark. Returns the moment it happened, for `undoCleanUp`.
 */
export async function cleanUp(profileId: ProfileId, occasionIds: OccasionId[]): Promise<string> {
  return must(
    await supabase.rpc("clean_up_after_occasions", {
      target_profile: profileId,
      occasion_ids: occasionIds,
      on_date: today(),
    }),
  ) as string;
}

export async function undoCleanUp(profileId: ProfileId, cleanedAt: string) {
  must(await supabase.rpc("undo_clean_up", { target_profile: profileId, cleaned_at: cleanedAt }));
}

/** Leaves everything as it is, and doesn't ask again for these occasions. */
export async function keepAfterOccasions(profileId: ProfileId, occasionIds: OccasionId[]) {
  must(
    await supabase.rpc("keep_after_occasions", {
      target_profile: profileId,
      occasion_ids: occasionIds,
    }),
  );
}

/** An item bought for an occasion its editors chose Keep for: they now see that, on the item. */
export type KeptItem = { item_id: ItemId; occasion_name: string; occasion_date: IsoDate };

/** Editors only; empty for anyone else. */
export async function getKeptItems(profileId: ProfileId): Promise<KeptItem[]> {
  return must(
    await supabase.rpc("kept_occasion_items", { target_profile: profileId }),
  ) as KeptItem[];
}

/** Removes a kept item (archived, like the cleanup). Returns the moment, for `undoCleanUp`. */
export async function archiveKeptItem(itemId: ItemId): Promise<string> {
  return must(await supabase.rpc("archive_kept_item", { target_item: itemId })) as string;
}

/** "I want another": clears the bought mark, so it can be bought again. Undone with `undoCleanUp`. */
export async function wantAnother(itemId: ItemId): Promise<string> {
  return must(await supabase.rpc("want_another", { target_item: itemId })) as string;
}
