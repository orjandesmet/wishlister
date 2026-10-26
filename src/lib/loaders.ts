import { getMyGroups, getGroup, type Group } from "./api/groups.ts";
import { getItems } from "./api/items.ts";
import { getFollowUntil } from "./api/follows.ts";
import { getOccasions, getUpcomingOccasions } from "./api/occasions.ts";
import { getProfileDetails } from "./api/profiles.ts";
import { getPurchases } from "./api/purchases.ts";
import { cached } from "./cache.ts";
import type { GroupId, ProfileId } from "./ids.ts";
import type { IsoDate } from "./occasions.ts";

// The API calls behind the pages people switch between, remembered (see cache.ts).

/** Your groups and everyone in them. Takes `true`: there's nothing to tell them apart by. */
export const loadMyGroups = cached<true, Group[]>("groups", () => getMyGroups());
/** Occasions on the groups overview. They're an extra there, so a failure means none. */
export const loadUpcomingOccasions = cached("upcomingOccasions", (from: IsoDate) =>
  getUpcomingOccasions(from).catch(() => []),
);
export const loadGroup = cached("group", (groupId: GroupId) => getGroup(groupId));
export const loadGroupOccasions = cached("groupOccasions", (groupId: GroupId) =>
  getOccasions(groupId),
);
export const loadProfileDetails = cached("profile", (profileId: ProfileId) =>
  getProfileDetails(profileId),
);
export const loadItems = cached("items", (profileId: ProfileId) => getItems(profileId));
/** By the list's item ids, in the order the list has them. */
export const loadPurchases = cached("purchases", getPurchases);
export const loadFollowUntil = cached("followUntil", (listId: ProfileId) => getFollowUntil(listId));
