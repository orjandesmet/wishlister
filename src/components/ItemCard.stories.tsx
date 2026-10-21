import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import type { GroupId, ItemId, OccasionId, ProfileId } from "../lib/ids.ts";
import { burstMoneyForTap } from "../lib/moneyBurst.ts";
import { ItemCard } from "./ItemCard.tsx";

const meta = {
  title: "Wishlist/ItemCard",
  component: ItemCard,
  // A card is an <li>, so each story puts it in the same list the page uses.
  decorators: [
    (Story) => (
      <ul class="list cards">
        <Story />
      </ul>
    ),
  ],
  args: {
    item: {
      id: "item-1" as ItemId,
      profile_id: "profile-1" as ProfileId,
      name: "LEGO Botanical bonsai tree",
      url: "https://www.lego.com/en-be/product/bonsai-tree-10281",
      category: "Toys",
      visible_in_all_groups: true,
      item_groups: [],
      price: 49.99,
      price_currency: "EUR",
    },
    purchase: "available",
    canEdit: false,
    groupNames: [],
    onBuy: fn(),
    onUndo: fn(),
    onRemove: fn(),
  },
  argTypes: {
    purchase: { control: "inline-radio", options: ["hidden", "available", "mine", "someone"] },
  },
} satisfies Meta<typeof ItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Someone else's list, nobody bought it yet. */
export const Available: Story = {};

/**
 * Tap "I bought this" to see the 💸 fly (only from €50, never with reduced motion),
 * and Undo to try again.
 */
export const BuyAnimation: Story = {
  args: { item: { ...meta.args.item, price: 59.99 } },
  render: (args) => {
    const [purchase, setPurchase] = createSignal(args.purchase);
    return (
      <ItemCard
        {...args}
        purchase={purchase()}
        onBuy={() => {
          setPurchase("mine");
          burstMoneyForTap(args.item.id, args.item.price, args.item.price_currency);
        }}
        onUndo={() => setPurchase("available")}
      />
    );
  },
};

export const BoughtByYou: Story = { args: { purchase: "mine" } };

export const BoughtByYouForAnOccasion: Story = {
  args: { purchase: "mine", boughtFor: "Christmas 2026" },
};

/** After "I bought this", when the item can be for more than one occasion. */
export const ChoosingAnOccasion: Story = {
  args: {
    occasionChoices: [
      {
        id: "occasion-1" as OccasionId,
        group_id: "group-1" as GroupId,
        name: "Sinterklaas 2026",
        date: "2026-12-06",
      },
      {
        id: "occasion-2" as OccasionId,
        group_id: "group-1" as GroupId,
        name: "Christmas 2026",
        date: "2026-12-25",
      },
    ],
    onPickOccasion: fn(),
    onCancelPick: fn(),
  },
};

export const BoughtBySomeoneElse: Story = { args: { purchase: "someone" } };

/** Your own list: you can edit, and never see who bought what. */
export const OwnList: Story = { args: { purchase: "hidden", canEdit: true } };

export const OnlyInSomeGroups: Story = {
  args: {
    purchase: "hidden",
    canEdit: true,
    item: { ...meta.args.item, visible_in_all_groups: false },
    groupNames: ["Family", "Book club"],
  },
};

/** In no group at all: only you see it, and it says so. */
export const NotShared: Story = {
  args: {
    purchase: "hidden",
    canEdit: true,
    item: { ...meta.args.item, visible_in_all_groups: false },
    groupNames: [],
  },
};

export const NameOnly: Story = {
  args: {
    item: {
      ...meta.args.item,
      name: "Warm socks",
      url: null,
      category: null,
      price: null,
      price_currency: null,
    },
  },
};

/** A price in another currency also shows roughly what it is in yours (EUR by default). */
export const ForeignPrice: Story = {
  args: { item: { ...meta.args.item, price: 59.99, price_currency: "USD" } },
};

export const LongNameAndUrl: Story = {
  args: {
    item: {
      ...meta.args.item,
      name: "A very long wish name that keeps going to see how the card wraps on a small phone",
      url: "https://www.example.com/a/very/long/link/that/should/be/cut/off/with/an/ellipsis?ref=wishlist",
    },
  },
};

/** Picking items for a bulk edit: tap the card to tick it. */
export const Selecting: Story = {
  args: {
    purchase: "hidden",
    canEdit: true,
    selecting: true,
    selected: false,
    onToggleSelect: fn(),
  },
};

export const Selected: Story = {
  args: { ...Selecting.args, selected: true },
};
