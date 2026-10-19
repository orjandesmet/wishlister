import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
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
      id: "item-1",
      profile_id: "profile-1",
      name: "LEGO Botanical bonsai tree",
      url: "https://www.lego.com/en-be/product/bonsai-tree-10281",
      category: "Toys",
      visible_in_all_groups: true,
      item_groups: [],
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

export const BoughtByYou: Story = { args: { purchase: "mine" } };

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

export const NameOnly: Story = {
  args: { item: { ...meta.args.item, name: "Warm socks", url: null, category: null } },
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
