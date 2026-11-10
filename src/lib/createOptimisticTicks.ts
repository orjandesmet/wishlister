import { createSignal } from "solid-js";
import type { ItemId } from "./ids.ts";

/**
 * "Delivered" ticks shown at once when changed, and put back if saving fails. Kept apart from
 * the loaded purchases so the rows (and the focused checkbox) stay as they are. Saves for one
 * item run one after the other, so quick taps cannot arrive out of order.
 */
export function createOptimisticTicks() {
  const [ticked, setTicked] = createSignal(new Map<ItemId, boolean>());
  const pending = new Map<ItemId, Promise<unknown>>();

  /** `undefined` forgets the tick, so the loaded value shows again. */
  const set = (itemId: ItemId, on: boolean | undefined) =>
    setTicked((map) => {
      const next = new Map(map);
      if (on === undefined) next.delete(itemId);
      else next.set(itemId, on);
      return next;
    });

  const change = (itemId: ItemId, on: boolean, save: (on: boolean) => Promise<void>) => {
    set(itemId, on);
    const result = (pending.get(itemId) ?? Promise.resolve()).then(async () => {
      try {
        await save(on);
      } catch (e) {
        set(itemId, !on);
        throw e;
      }
    });
    const tail = result.catch(() => {});
    pending.set(itemId, tail);
    void tail.then(() => {
      if (pending.get(itemId) === tail) pending.delete(itemId);
    });
    return result;
  };

  return { ticked, set, change };
}
