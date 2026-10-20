import { createSignal, onCleanup, type Accessor } from "solid-js";
import { addQuickItems, type GroupSelection, type Item } from "./api/items.ts";
import { getPageInfo, type PageInfo } from "./api/pageInfo.ts";
import type { ItemId, ProfileId } from "./ids.ts";
import { linkLabel, splitLink } from "./links.ts";
import { QuickAddQueue, type PendingItem, type QuickAddState } from "./quickAddQueue.ts";

/** What quick add keeps with each typed name until it's saved. */
type QuickItemData = {
  id: ItemId;
  groups: GroupSelection;
  /** A link that was pasted with (or instead of) the name. */
  url: string | null;
  /** No name was typed, only a link: the page's title becomes the name. */
  nameFromPage: boolean;
  /**
   * The linked page's title and picture, looked up as soon as the link is added so
   * it's usually there by the time the batch saves. Kept across retries.
   */
  page: Promise<PageInfo> | null;
};

/** The row to save for a pending item, once its page lookup (if any) is done. */
async function toQuickItem({ name, data }: PendingItem<QuickItemData>) {
  const page = data.page ? await data.page : null;
  return {
    id: data.id,
    name: (data.nameFromPage && page?.title) || name,
    groups: data.groups,
    url: data.url,
    imageUrl: page?.image ?? null,
  };
}

// One queue per list, kept outside the page: leaving the page flushes it, and a
// retry that is still running shows up again when you come back.
const queues = new Map<ProfileId, QuickAddQueue<QuickItemData, Item>>();

function queueFor(profileId: ProfileId) {
  let queue = queues.get(profileId);
  if (!queue) {
    queue = new QuickAddQueue({
      save: async (pending) =>
        addQuickItems(profileId, await Promise.all(pending.map(toQuickItem))),
    });
    queues.set(profileId, queue);
  }
  return queue;
}

// Closing the tab or switching apps on a phone: save what's waiting.
if (typeof window !== "undefined") {
  const flushAll = () => queues.forEach((queue) => queue.flush());
  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}

/**
 * Quick add for one list, for use in a component. `onSaved` gets the rows of each
 * successful save, so the page can show them before they leave the pending list.
 */
export function useQuickAdd(profileId: ProfileId, onSaved: (items: Item[]) => void) {
  const queue = queueFor(profileId);
  const [state, setState] = createSignal<QuickAddState<QuickItemData>>(queue.state);
  const stopState = queue.subscribe(setState);
  const stopSaved = queue.onSaved(onSaved);
  onCleanup(() => {
    stopState();
    stopSaved();
    queue.flush();
  });
  return {
    state: state as Accessor<QuickAddState<QuickItemData>>,
    // The id is made now, so every retry of this item saves the same row.
    add: (text: string, groups: GroupSelection) => {
      // A pasted link becomes the item's link. Until the page's title is found, an
      // item with only a link shows a short version of it as its name.
      const { url, name } = splitLink(text);
      queue.add(name || (url ? linkLabel(url) : ""), {
        id: crypto.randomUUID() as ItemId,
        groups,
        url,
        nameFromPage: !name && url !== null,
        page: url ? getPageInfo(url) : null,
      });
    },
    cancel: () => queue.cancel(),
  };
}
