import type { PendingCleanup } from "./api/cleanup.ts";
import type { OccasionId } from "./ids.ts";
import type { IsoDate } from "./occasions.ts";

/** One "N items were bought for <occasion>. Remove them?" question. */
export type CleanupPrompt = {
  occasionIds: OccasionId[];
  name: string;
  date: IsoDate;
  count: number;
};

/**
 * One question per occasion, oldest first. Two groups can each have their own
 * "Christmas 2026" on the same day: to the list's owner that's one Christmas, so
 * they're asked once.
 */
export function cleanupPrompts(pending: PendingCleanup[]): CleanupPrompt[] {
  const byOccasion = new Map<string, CleanupPrompt>();
  for (const row of pending) {
    const key = `${row.occasion_date} ${row.occasion_name.trim().toLowerCase()}`;
    const prompt = byOccasion.get(key);
    if (prompt) {
      prompt.occasionIds.push(row.occasion_id);
      prompt.count += row.item_count;
    } else {
      byOccasion.set(key, {
        occasionIds: [row.occasion_id],
        name: row.occasion_name,
        date: row.occasion_date,
        count: row.item_count,
      });
    }
  }
  return [...byOccasion.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
