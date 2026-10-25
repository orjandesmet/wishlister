import { supabase } from "../supabase.ts";
import type { GroupId, OccasionId, ProfileId } from "../ids.ts";
import { today, type IsoDate } from "../occasions.ts";
import { themeWindow, type OccasionTheme } from "../theme.ts";
import { must } from "./must.ts";

/**
 * A date a group buys presents for, like Christmas. `date` is "2026-12-25". `theme`
 * recolours the app for the group's members around that date; null keeps their own.
 */
export type Occasion = {
  id: OccasionId;
  group_id: GroupId;
  name: string;
  date: IsoDate;
  theme: OccasionTheme | null;
};
export type OccasionInput = { name: string; date: IsoDate; theme: OccasionTheme | null };

const fields = "id, group_id, name, date, theme";

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

/**
 * The themed occasions, across every group you're in, whose theme could show on
 * `on`: from the day before up to two weeks ahead.
 */
export async function getThemedOccasions(on: IsoDate): Promise<Occasion[]> {
  const { from, to } = themeWindow(on);
  return must(
    await supabase
      .from("occasions")
      .select(fields)
      .not("theme", "is", null)
      .gte("date", from)
      .lte("date", to),
  ) as Occasion[];
}

/** Managers only. */
export async function addOccasion(groupId: GroupId, input: OccasionInput) {
  must(
    await supabase
      .from("occasions")
      .insert({ group_id: groupId, name: input.name.trim(), date: input.date, theme: input.theme })
      .select("id"),
  );
}

/** Managers only. */
export async function updateOccasion(occasionId: OccasionId, input: OccasionInput) {
  must(
    await supabase
      .from("occasions")
      .update({ name: input.name.trim(), date: input.date, theme: input.theme })
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
export async function getNextSharedOccasion(
  profileId: ProfileId,
): Promise<Omit<Occasion, "theme"> | null> {
  const rows = must(
    await supabase.rpc("next_shared_occasion", { target_profile: profileId, from_date: today() }),
  ) as Omit<Occasion, "theme">[];
  return rows[0] ?? null;
}
