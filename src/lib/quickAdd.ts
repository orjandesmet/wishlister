import { createSignal, onCleanup, type Accessor } from "solid-js";
import { addQuickItems, type GroupSelection, type Item } from "./api/items.ts";
import type { ItemId, ProfileId } from "./ids.ts";
import { QuickAddQueue, type QuickAddState } from "./quickAddQueue.ts";

/** What quick add keeps with each typed name until it's saved. */
type QuickItemData = { id: ItemId; groups: GroupSelection };

// One queue per list, kept outside the page: leaving the page flushes it, and a
// retry that is still running shows up again when you come back.
const queues = new Map<ProfileId, QuickAddQueue<QuickItemData, Item>>();

function queueFor(profileId: ProfileId) {
  let queue = queues.get(profileId);
  if (!queue) {
    queue = new QuickAddQueue({
      save: (pending) =>
        addQuickItems(
          profileId,
          pending.map((item) => ({ name: item.name, ...item.data })),
        ),
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
    add: (name: string, groups: GroupSelection) =>
      queue.add(name, { id: crypto.randomUUID() as ItemId, groups }),
    cancel: () => queue.cancel(),
  };
}
