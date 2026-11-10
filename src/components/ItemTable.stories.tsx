import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { Item } from "../lib/api/items.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import type { GroupId, ItemId, OccasionId, ProfileId } from "../lib/ids.ts";
import type { PurchaseState } from "../lib/createPurchases.ts";
import { ItemTable, type ItemTableProps } from "./ItemTable.tsx";

const id = (n: number) => `item-${n}` as ItemId;

const item = (n: number, name: string, extra: Partial<Item> = {}): Item => ({
  id: id(n),
  profile_id: "anna" as ProfileId,
  name,
  url: null,
  category: null,
  description: null,
  visible_in_all_groups: true,
  not_wanted: false,
  wanted_level: 1,
  item_groups: [],
  price: null,
  price_currency: null,
  image_url: null,
  item_pictures: [],
  removed_at: null,
  ...extra,
});

const items: Item[] = [
  item(1, "LEGO Botanical bonsai tree", {
    url: "https://www.lego.com/en-be/product/bonsai-tree-10281",
    category: "Toys",
    wanted_level: 3,
    price: 49.99,
    price_currency: "EUR",
    description: "The **10281** set, not the smaller one.",
  }),
  item(2, "Merino scarf, grey", {
    category: "Clothes",
    wanted_level: 2,
    price: 39,
    price_currency: "EUR",
  }),
  item(3, "Cast iron skillet", {
    url: "https://www.bol.com/be/nl/",
    category: "Kitchen",
    price: 62.5,
    price_currency: "EUR",
  }),
  item(4, "Pour-over coffee set", { category: "Kitchen", price: 34.95, price_currency: "EUR" }),
];

const christmas: Occasion = {
  id: "xmas" as OccasionId,
  group_id: "family" as GroupId,
  name: "Christmas 2026",
  date: "2026-12-25",
};
const birthday: Occasion = {
  id: "birthday" as OccasionId,
  group_id: "friends" as GroupId,
  name: "Anna's birthday",
  date: "2026-12-02",
};

const baseArgs: ItemTableProps = {
  items,
  canEdit: false,
  sort: null,
  onSort: fn(),
  showBought: true,
  purchase: () => "available",
  boughtFor: () => undefined,
  groupNames: () => [],
  occasionChoices: () => undefined,
  onBuy: fn(),
  onPickOccasion: fn(),
  onCancelPick: fn(),
  onUndo: fn(),
  onChangeWant: fn(),
  onRemove: fn(),
  questions: () => null,
  questionList: () => [],
  selected: new Set<ItemId>(),
  onToggleSelect: fn(),
  onSelectAll: fn(),
  onSelectNone: fn(),
};

const meta = {
  title: "Wishlist/ItemTable",
  component: ItemTable,
  // The table view only exists on wide screens (see the Viewport toolbar).
  parameters: { layout: "padded" },
  args: baseArgs,
} satisfies Meta<typeof ItemTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Someone else's list, nothing bought yet: each row has "I bought this". */
export const Available: Story = {};

/** The three things a row can say about buying: yours (with Undo), someone else's, or open. */
export const MixedPurchases: Story = {
  args: {
    purchase: (i) =>
      i.id === id(1) ? "mine" : i.id === id(2) ? "someone" : ("available" as PurchaseState),
    boughtFor: (i) => (i.id === id(1) ? "Christmas 2026" : undefined),
  },
};

/** Without the delivery setting, your purchase is the pill and Undo. Undo keeps its word. */
export const BoughtByYou: Story = {
  args: { purchase: (i) => (i.id === id(1) ? "mine" : "available") },
  play: async ({ canvasElement, args }) => {
    const table = within(canvasElement);
    await expect(table.queryByRole("checkbox", { name: /Delivered/ })).toBeNull();
    await userEvent.click(table.getByRole("button", { name: /Undo/ }));
    await expect(args.onUndo).toHaveBeenCalledWith(args.items[0]);
  },
};

/**
 * "Show delivery status on item cards" is on (Settings): the pill ends in a red Undo and the
 * Delivered tick follows, in the same column. Buy, tick and undo to try it.
 */
export const WithDeliveryTick: Story = {
  render: (args) => {
    const [bought, setBought] = createSignal(new Set<ItemId>([id(1), id(3)]));
    const [delivered, setDelivered] = createSignal(new Set<ItemId>([id(3)]));
    const toggle = (set: Set<ItemId>, id: ItemId, on: boolean) => {
      const next = new Set(set);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    };
    return (
      <ItemTable
        {...args}
        purchase={(i) => (bought().has(i.id) ? "mine" : i.id === id(2) ? "someone" : "available")}
        boughtFor={(i) => (i.id === id(3) ? "Christmas 2026" : undefined)}
        onBuy={(i) => setBought((set) => toggle(set, i.id, true))}
        onUndo={(i) => {
          setBought((set) => toggle(set, i.id, false));
          setDelivered((set) => toggle(set, i.id, false));
        }}
        delivered={(i) => delivered().has(i.id)}
        onDelivered={(i, on) => setDelivered((set) => toggle(set, i.id, on))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const table = within(canvasElement);
    const tick = table.getByRole("checkbox", { name: /Delivered\s*: LEGO Botanical/ });
    await expect(tick).not.toBeChecked();
    await userEvent.click(tick);
    await expect(tick).toBeChecked();
    // The other purchase started out delivered.
    await expect(
      table.getByRole("checkbox", { name: /Delivered\s*: Cast iron skillet/ }),
    ).toBeChecked();
    await userEvent.click(table.getByRole("button", { name: /Undo\s*: LEGO Botanical/ }));
    await expect(
      table.getByRole("button", { name: /I bought this\s*: LEGO Botanical/ }),
    ).toBeVisible();
  },
};

/** After "I bought this", when the item can be for more than one occasion. */
export const ChoosingAnOccasion: Story = {
  args: {
    occasionChoices: (i) => (i.id === id(3) ? [christmas, birthday] : undefined),
  },
};

/** Sorted by price, low to high: the arrow shows in the header and in aria-sort. */
export const SortedByPrice: Story = {
  args: {
    sort: { column: "price", direction: "ascending" },
    items: [...items].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)),
  },
};

/** Your own list: checkboxes, "Visible in", Edit and Remove; nothing about buying. */
export const OwnList: Story = {
  args: {
    canEdit: true,
    showBought: false,
    purchase: (): PurchaseState => "hidden",
    groupNames: (i) => (i.id === id(2) ? ["Family"] : []),
    items: items.map((i) => (i.id === id(2) ? { ...i, visible_in_all_groups: false } : i)),
  },
};

/** Picking items for a bulk action: some rows are ticked. */
export const SelectingItems: Story = {
  args: { canEdit: true, selected: new Set<ItemId>([id(1), id(3)]) },
};

/** "Please don't buy" entries, in their own pale red table below the wishes. */
export const NotWanted: Story = {
  args: {
    notWanted: true,
    items: [
      item(10, "Anything with candles", { not_wanted: true }),
      item(11, "Another mug", { not_wanted: true }),
    ],
  },
};
