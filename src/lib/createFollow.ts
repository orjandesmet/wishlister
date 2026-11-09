import { createResource, createSignal, onCleanup } from "solid-js";
import { announce } from "./a11y.ts";
import { followList, unfollowList } from "./api/follows.ts";
import { createCachedResource } from "./cache.ts";
import { loadFollowUntil } from "./loaders.ts";
import { getNextSharedOccasion } from "./api/occasions.ts";
import { locale, t } from "./i18n.ts";
import type { ProfileId } from "./ids.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import { formatOccasionDate, today, type IsoDate } from "./occasions.ts";

/** How long the "you're now following" tooltip stays. */
const FOLLOWED_NOTICE_MS = 3500;

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

  const isFollowing = () => {
    const until = followUntil.latest;
    return until != null && until >= today();
  };

  // Buying follows the list for you; the bell wiggles and says so for a moment.
  const [justFollowed, setJustFollowed] = createSignal(false);
  let followedTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(followedTimer));

  return {
    followUntil,
    nextOccasion,
    busy,
    isFollowing,
    /** True for a moment after buying started following the list. */
    justFollowed,
    // The bell's label changes with these, but out of sight once its popover closes: say it.
    follow: async (until: IsoDate) => {
      await change(() => followList(profileId(), until));
      if (!runner.error()) {
        announce(t("follow.untilDate", { date: formatOccasionDate(until, locale()) }));
      }
    },
    unfollow: async () => {
      await change(() => unfollowList(profileId()));
      if (!runner.error()) announce(t("a11y.unfollowed"));
    },
    /** After buying something on the list, which follows it for you (the database does that). */
    afterBuying: async () => {
      const was = isFollowing();
      await refetchFollow();
      if (was || !isFollowing()) return;
      setJustFollowed(true);
      clearTimeout(followedTimer);
      followedTimer = setTimeout(() => setJustFollowed(false), FOLLOWED_NOTICE_MS);
    },
  };
}
