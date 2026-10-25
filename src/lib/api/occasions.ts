import { supabase } from "../supabase.ts";
import type { GroupId, OccasionId, ProfileId } from "../ids.ts";
import { today, type IsoDate } from "../occasions.ts";
import { must } from "./must.ts";

/** A date a group buys presents for, like Christmas. `date` is "2026-12-25". */
export type Occasion = { id: OccasionId; group_id: GroupId; name: string; date: IsoDate };
export type OccasionInput = { name: string; date: IsoDate };

const fields = "id, group_id, name, date";

/** All of a group's occasions, past ones too. Every member can read them. */
export async function getOccasions(groupId: GroupId): Promise<Occasion[]> {
  return must(
    await supabase.from("occasions").select(fields).eq("group_id", groupId).order("date"),
  ) as Occasion[];
}

/**
 * Occasions from `from` on (today counts), soonest first, across every group
 * you're in. One request for the whole home page.
 */
export async function getUpcomingOccasions(from: IsoDate): Promise<Occasion[]> {
  return must(
    await supabase.from("occasions").select(fields).gte("date", from).order("date"),
  ) as Occasion[];
}

/** Managers only. */
export async function addOccasion(groupId: GroupId, input: OccasionInput) {
  must(
    await supabase
      .from("occasions")
      .insert({ group_id: groupId, name: input.name.trim(), date: input.date })
      .select("id"),
  );
}

/** Managers only. */
export async function updateOccasion(occasionId: OccasionId, input: OccasionInput) {
  must(
    await supabase
      .from("occasions")
      .update({ name: input.name.trim(), date: input.date })
      .eq("id", occasionId)
      .select("id"),
  );
}

/** Managers only. */
export async function deleteOccasion(occasionId: OccasionId) {
  must(await supabase.from("occasions").delete().eq("id", occasionId));
}

/**
 * The next occasion, from today on, in a group you share with this person where
 * their list is shown. Null when there's none. Meant as the default end date for
 * following someone's list.
 */
export async function getNextSharedOccasion(profileId: ProfileId): Promise<Occasion | null> {
  const rows = must(
    await supabase.rpc("next_shared_occasion", { target_profile: profileId, from_date: today() }),
  ) as Occasion[];
  return rows[0] ?? null;
}
