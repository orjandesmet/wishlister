import { supabase } from "../supabase.ts";
import type { ProfileId } from "../ids.ts";
import type { IsoDate } from "../occasions.ts";
import { must } from "./must.ts";

/**
 * Until when I follow this list, or null when I don't. A date in the past means
 * the follow has ended.
 */
export async function getFollowUntil(listId: ProfileId): Promise<IsoDate | null> {
  const row = must(
    await supabase.from("list_follows").select("until").eq("list_id", listId).maybeSingle(),
  ) as { until: IsoDate } | null;
  return row?.until ?? null;
}

/** Starts following a list, or changes the end date. */
export async function followList(listId: ProfileId, until: IsoDate) {
  must(await supabase.rpc("follow_list", { target_profile: listId, until_date: until }));
}

export async function unfollowList(listId: ProfileId) {
  must(await supabase.from("list_follows").delete().eq("list_id", listId));
}
