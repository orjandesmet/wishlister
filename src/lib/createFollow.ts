import { createResource } from "solid-js";
import { followList, unfollowList } from "./api/follows.ts";
import { createCachedResource } from "./cache.ts";
import { loadFollowUntil } from "./loaders.ts";
import { getNextSharedOccasion } from "./api/occasions.ts";
import type { ProfileId } from "./ids.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import type { IsoDate } from "./occasions.ts";

/** Following someone else's list. `otherList` is their id once we know it isn't your own. */
export function createFollow(
  profileId: () => ProfileId,
  otherList: () => ProfileId | undefined,
  runner: ActionRunner,
) {
  const [followUntil, { refetch: refetchFollow }] = createCachedResource(
    otherList,
    loadFollowUntil,
  );
  // Only the starting point for the date picker, so a failure just means no suggestion.
  const [nextOccasion] = createResource(otherList, (id) =>
    getNextSharedOccasion(id).catch(() => null),
  );
  const [busy, runBusy] = runner.busyRunner();

  const change = (action: () => Promise<void>) =>
    runBusy(async () => {
      await action();
      await refetchFollow();
    });

  return {
    followUntil,
    nextOccasion,
    busy,
    refetchFollow,
    follow: (until: IsoDate) => change(() => followList(profileId(), until)),
    unfollow: () => change(() => unfollowList(profileId())),
  };
}
