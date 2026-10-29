import { createRoot, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Item } from "./api/items.ts";
import { createListSections, holdMs } from "./createListSections.ts";
import type { ItemId, ProfileId } from "./ids.ts";

const item = (id: string, wanted_level: Item["wanted_level"]): Item => ({
  id: id as ItemId,
  profile_id: "anna" as ProfileId,
  name: id,
  url: null,
  category: null,
  description: null,
  visible_in_all_groups: true,
  not_wanted: false,
  wanted_level,
  item_groups: [],
  price: null,
  price_currency: null,
  image_url: null,
  item_pictures: [],
  removed_at: null,
});

describe("createListSections", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("keeps a card in place for a moment after its wanted level changes", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal([item("a", 3), item("b", 2), item("c", 1)]);
      const reorder = vi.fn((apply: () => void) => apply());
      const list = createListSections(items, () => undefined, reorder);
      list.chooseOrder("wanted");
      const names = () => list.itemsIn(null).map((i) => i.name);
      expect(names()).toEqual(["a", "b", "c"]);

      // c goes 1 → 2 → 3 in two quick taps: it stays put until the taps stop.
      list.holdPlace(items()[2]);
      setItems((prev) => prev.map((i) => (i.id === "c" ? { ...i, wanted_level: 2 } : i)));
      vi.advanceTimersByTime(holdMs - 100);
      list.holdPlace(items()[2]);
      setItems((prev) => prev.map((i) => (i.id === "c" ? { ...i, wanted_level: 3 } : i)));
      vi.advanceTimersByTime(holdMs - 100);
      expect(names()).toEqual(["a", "b", "c"]);
      expect(reorder).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(reorder).toHaveBeenCalledOnce();
      expect(names()).toEqual(["a", "c", "b"]);
      dispose();
    });
  });

  it("keeps the same categories while the items in them change", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal([item("a", 1), item("b", 1)]);
      const list = createListSections(items, () => undefined);
      const before = list.categories();
      setItems((prev) => prev.map((i) => ({ ...i, wanted_level: 2 })));
      expect(list.categories()).toEqual(before);
      dispose();
    });
  });
});
