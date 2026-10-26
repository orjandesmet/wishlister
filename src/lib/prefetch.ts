import type { Group } from "./api/groups.ts";
import type { GroupId, ProfileId } from "./ids.ts";
import {
  loadFollowUntil,
  loadGroup,
  loadGroupOccasions,
  loadItems,
  loadMyGroups,
  loadProfileDetails,
  loadPurchases,
  loadUpcomingOccasions,
} from "./loaders.ts";
import { today } from "./occasions.ts";

/** Loading ahead when someone is about to open a page: often enough to stay fresh. */
const INTENT_MAX_AGE_MS = 30_000;
/** Loading ahead in quiet moments, for pages nobody pointed at yet: less often. */
const IDLE_MAX_AGE_MS = 5 * 60_000;
/** Lists loaded ahead at the same time, to leave room for what the page itself loads. */
const IDLE_BATCH = 3;

/** Loads what a list page shows: its owner, items, purchases, and whether you follow it. */
async function prefetchList(profileId: ProfileId, myProfileId: ProfileId, maxAgeMs: number) {
  const [, items] = await Promise.all([
    loadProfileDetails.prefetch(profileId, maxAgeMs),
    loadItems.prefetch(profileId, maxAgeMs),
    profileId === myProfileId ? undefined : loadFollowUntil.prefetch(profileId, maxAgeMs),
  ]);
  if (items) {
    await loadPurchases.prefetch(
      items.map((item) => item.id),
      maxAgeMs,
    );
  }
}

/** The page an address inside the app opens, as far as loading ahead goes. */
export type PrefetchTarget =
  | { page: "home" }
  | { page: "list"; profileId: ProfileId }
  | { page: "group"; groupId: GroupId };

export function prefetchTarget(pathname: string): PrefetchTarget | undefined {
  if (pathname === "/") return { page: "home" };
  const list = /^\/lists\/([^/]+)\/?$/.exec(pathname);
  if (list) return { page: "list", profileId: decodeURIComponent(list[1]) as ProfileId };
  const group = /^\/groups\/([^/]+)\/?$/.exec(pathname);
  if (group && group[1] !== "new") {
    return { page: "group", groupId: decodeURIComponent(group[1]) as GroupId };
  }
  return undefined;
}

/** Starts loading what the page at `pathname` shows, so it opens with it already there. */
export function prefetchPath(
  pathname: string,
  myProfileId: ProfileId,
  maxAgeMs = INTENT_MAX_AGE_MS,
): Promise<unknown> {
  const target = prefetchTarget(pathname);
  switch (target?.page) {
    case "home":
      return Promise.all([
        loadMyGroups.prefetch(true, maxAgeMs),
        loadUpcomingOccasions.prefetch(today(), maxAgeMs),
      ]);
    case "list":
      return prefetchList(target.profileId, myProfileId, maxAgeMs);
    case "group":
      return Promise.all([
        loadGroup.prefetch(target.groupId, maxAgeMs),
        loadGroupOccasions.prefetch(target.groupId, maxAgeMs),
      ]);
    default:
      return Promise.resolve();
  }
}

/**
 * Every list you can open: your own and your children's, then the lists your groups show
 * (not guardians': theirs is hidden there), each once.
 */
export function visibleLists(own: ProfileId[], groups: Group[]): ProfileId[] {
  const others = groups.flatMap((group) =>
    group.group_members.filter((m) => m.role !== "guardian").map((m) => m.profile_id),
  );
  return [...new Set([...own, ...others])];
}

const idle = (): Promise<void> =>
  new Promise((resolve) => {
    if ("requestIdleCallback" in window) requestIdleCallback(() => resolve(), { timeout: 2000 });
    else setTimeout(resolve, 200);
  });

/** Data saver on, or a slow connection: don't load what nobody asked for. */
function saveData(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return connection?.saveData === true || /(^|-)2g$/.test(connection?.effectiveType ?? "");
}

/**
 * In quiet moments after the app starts, loads the groups overview and every list you can
 * open, a few at a time, so switching between them is instant. Your own lists go first.
 */
export async function warmUp(myProfileId: ProfileId, ownLists: ProfileId[]) {
  if (saveData()) return;
  await idle();
  await prefetchPath("/", myProfileId, IDLE_MAX_AGE_MS);
  const groups = loadMyGroups.peek(true) ?? [];
  const lists = visibleLists(ownLists, groups);
  for (let i = 0; i < lists.length; i += IDLE_BATCH) {
    await idle();
    await Promise.all(
      lists.slice(i, i + IDLE_BATCH).map((id) => prefetchList(id, myProfileId, IDLE_MAX_AGE_MS)),
    );
  }
}

/**
 * Loads a page ahead as soon as someone points at, touches or tabs to a link to it.
 * Returns a function that stops listening.
 */
export function prefetchOnIntent(myProfileId: () => ProfileId): () => void {
  const onIntent = (event: Event) => {
    const link = (event.target as Element | null)?.closest?.("a[href]");
    if (!(link instanceof HTMLAnchorElement) || link.origin !== location.origin) return;
    void prefetchPath(link.pathname, myProfileId());
  };
  const events = ["pointerdown", "mouseover", "focusin"] as const;
  for (const type of events) document.addEventListener(type, onIntent, { passive: true });
  return () => {
    for (const type of events) document.removeEventListener(type, onIntent);
  };
}
