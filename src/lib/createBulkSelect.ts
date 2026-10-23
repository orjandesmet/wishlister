import { createMemo, createSignal } from "solid-js";
import type { Item } from "./api/items.ts";
import type { ItemId } from "./ids.ts";

/** Bulk edit: tick items, then apply one action to all of them. */
export function createBulkSelect(items: () => Item[] | undefined) {
  const [selecting, setSelecting] = createSignal(false);
  const [selected, setSelected] = createSignal<ReadonlySet<ItemId>>(new Set());

  // Items deleted elsewhere drop out of the selection when the list reloads.
  const selectedIds = createMemo(() =>
    (items() ?? []).map((item) => item.id).filter((id) => selected().has(id)),
  );

  const toggle = (id: ItemId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const selectNone = () => setSelected(new Set<ItemId>());
  const selectAll = () => setSelected(new Set((items() ?? []).map((item) => item.id)));
  const start = () => setSelecting(true);
  const stop = () => {
    setSelecting(false);
    selectNone();
  };

  return { selecting, selected, selectedIds, toggle, selectAll, selectNone, start, stop };
}
