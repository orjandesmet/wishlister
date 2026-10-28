import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vite-plus/test";
import type { Item } from "./api/items.ts";
import type { Purchase } from "./api/purchases.ts";
import { createActionRunner } from "./createActionRunner.ts";
import { createPurchases } from "./createPurchases.ts";
import type { ItemId, ProfileId } from "./ids.ts";

const purchases: { current: Purchase[] } = { current: [] };
vi.mock("./loaders.ts", () => ({
  loadPurchases: Object.assign(async () => purchases.current, {
    peek: () => undefined,
    prefetch: async () => undefined,
  }),
}));
const undoBought = vi.fn(async (itemId: ItemId) => {
  purchases.current = purchases.current.filter((p) => p.item_id !== itemId);
});
vi.mock("./api/purchases.ts", () => ({
  undoBought: (itemId: ItemId) => undoBought(itemId),
  markBought: vi.fn(),
  getPurchaseOccasions: vi.fn(async () => []),
}));
vi.mock("./a11y.ts", () => ({ announce: vi.fn() }));

const me = "me" as ProfileId;
const item = (overrides: Partial<Item> = {}): Item => ({
  id: "item-1" as ItemId,
  profile_id: "anna" as ProfileId,
  name: "Board game",
  url: null,
  category: null,
  description: null,
  visible_in_all_groups: true,
  not_wanted: false,
  want_level: 1,
  item_groups: [],
  price: null,
  price_currency: null,
  image_url: null,
  item_pictures: [],
  removed_at: null,
  ...overrides,
});

async function setup(items: Item[]) {
  const gone = vi.fn();
  const result = createRoot(() =>
    createPurchases(
      () => items,
      () => false,
      () => me,
      createActionRunner(),
      () => undefined,
      gone,
    ),
  );
  await vi.waitFor(() => expect(result.purchase(items[0])).not.toBe("hidden"));
  return { ...result, gone };
}

describe("createPurchases", () => {
  it("offers 'I bought this' again after undoing an ordinary purchase", async () => {
    purchases.current = [{ item_id: "item-1" as ItemId, bought_by: me, occasion: null }];
    const wish = item();
    const p = await setup([wish]);
    expect(p.purchase(wish)).toBe("mine");
    await p.onUndo(wish);
    await vi.waitFor(() => expect(p.purchase(wish)).toBe("available"));
    expect(p.gone).not.toHaveBeenCalled();
  });

  it("drops a removed item once its purchase is undone, and never offers to buy it", async () => {
    purchases.current = [{ item_id: "item-1" as ItemId, bought_by: me, occasion: null }];
    const removed = item({ removed_at: "2026-10-26T09:00:00Z" });
    const p = await setup([removed]);
    expect(p.purchase(removed)).toBe("mine");
    await p.onUndo(removed);
    expect(p.gone).toHaveBeenCalledWith(removed);
    purchases.current = [];
    expect(p.purchase({ ...removed, id: "other" as ItemId })).toBe("hidden");
  });
});
