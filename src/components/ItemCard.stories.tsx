import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { GroupId, ItemId, OccasionId, ProfileId } from "../lib/ids.ts";
import { burstMoneyForTap } from "../lib/moneyBurst.ts";
import { ItemCard } from "./ItemCard.tsx";
import {
  bellPicture,
  bikePicture,
  bonsaiPicture,
  brokenPicture,
  helmetPicture,
  scarfPicture,
} from "../stories/samplePictures.ts";
import u from "../utilities.module.css";

const meta = {
  title: "Wishlist/ItemCard",
  component: ItemCard,
  // A card is an <li>, so each story puts it in the same list the page uses.
  decorators: [
    (Story) => (
      <ul class={`${u.list} ${u.cards}`}>
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
      description: null,
      visible_in_all_groups: true,
      not_wanted: false,
      item_groups: [],
      price: 49.99,
      price_currency: "EUR",
      image_url: null,
      item_pictures: [],
      removed_at: null,
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

/** The owner took it off their list after you bought it: they don't know, and you got an email. */
export const RemovedAfterYouBoughtIt: Story = {
  args: { purchase: "mine", item: { ...meta.args.item, removed_at: "2026-10-25T09:00:00Z" } },
};

/** Taken off the list after someone else bought it: it stays so nobody buys it twice. */
export const RemovedAfterSomeoneBoughtIt: Story = {
  args: { purchase: "someone", item: { ...meta.args.item, removed_at: "2026-10-25T09:00:00Z" } },
};

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

/** The linked page's picture, beside the name. Screen readers skip it: the name says it all. */
export const WithPicture: Story = {
  args: { item: { ...meta.args.item, image_url: bonsaiPicture } },
};

/** Tapping the picture opens it bigger; Close (or Escape, or tapping outside) brings you back. */
export const PictureOpened: Story = {
  args: WithPicture.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /view picture/i }));
    await expect(canvas.getByRole("dialog")).toBeVisible();
  },
};

/** A picture that isn't square is shown whole. */
export const WithWidePicture: Story = {
  args: {
    item: { ...meta.args.item, name: "Merino scarf, grey", price: 35, image_url: scarfPicture },
  },
};

/** A picture that can't be loaded is left out, instead of a broken-image icon. */
export const PictureCantLoad: Story = {
  args: { item: { ...meta.args.item, image_url: brokenPicture } },
};

/** Own pictures (#95) come first; the number on the thumbnail says how many there are. */
export const WithSeveralPictures: Story = {
  args: {
    item: {
      ...meta.args.item,
      image_url: bonsaiPicture,
      item_pictures: [{ id: "p1", path: null, url: scarfPicture, position: 0 }],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /view 2 pictures/i }));
    await expect(canvas.getAllByRole("img", { name: /picture \d of 2/i })).toHaveLength(2);
  },
};

/**
 * The most an item can have: 5 own pictures (uploaded or linked) and the link's picture
 * after them. Opened, the dialog shows all 6 in order.
 */
export const WithManyPictures: Story = {
  args: {
    item: {
      ...meta.args.item,
      name: "Kids' bike, 20 inch",
      price: 229,
      category: "Sports",
      url: "https://www.example.com/kids-bike",
      image_url: bonsaiPicture,
      item_pictures: [bikePicture, bellPicture, helmetPicture, scarfPicture, bikePicture].map(
        (url, position) => ({
          id: `p${position}`,
          path: null,
          url: `${url}#${position}`,
          position,
        }),
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /view 6 pictures/i }));
    await expect(canvas.getAllByRole("img", { name: /picture \d of 6/i })).toHaveLength(6);
  },
};

export const PictureOnYourOwnList: Story = {
  args: { ...WithPicture.args, purchase: "hidden", canEdit: true },
};

export const LongNameWithPicture: Story = {
  args: {
    item: {
      ...meta.args.item,
      name: "A very long wish name that keeps going to see how the card wraps on a small phone",
      image_url: bonsaiPicture,
    },
  },
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

/** The checkbox stays on the left, before the picture, so it lines up with cards without one. */
export const SelectingWithPicture: Story = {
  args: { ...Selecting.args, item: { ...meta.args.item, image_url: bonsaiPicture } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Tapping anywhere on the card ticks the box, which is named after the item.
    await userEvent.click(canvas.getByText(args.item.name));
    await expect(args.onToggleSelect).toHaveBeenCalledOnce();
    await expect(canvas.getByRole("checkbox", { name: args.item.name })).toBeChecked();
  },
};

/** "Please don't buy": shown apart, and nobody can buy it. */
export const NotWanted: Story = {
  args: {
    purchase: "hidden",
    item: { ...meta.args.item, name: "More mugs", url: null, category: null, not_wanted: true },
  },
};

export const NotWantedOnYourOwnList: Story = {
  args: { ...NotWanted.args, canEdit: true },
};

/** A short description shows as it is, under the name. */
export const WithShortDescription: Story = {
  args: {
    item: { ...meta.args.item, description: "The **small** one, for on the windowsill." },
  },
};

const longDescription = `Any of these is fine:

- the *cherry blossom* one
- the **classic** green one, see https://www.lego.com/en-be/product/bonsai-tree-10281
- [the orchid](https://www.lego.com/en-be/product/orchid-10311), if the bonsai is sold out

Not the big one, that won't fit.`;

/**
 * A longer one starts as two lines of plain text. "Show more" opens the real thing,
 * with its list and links; screen readers hear whether it's open.
 */
export const WithLongDescription: Story = {
  args: { item: { ...meta.args.item, description: longDescription } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const more = canvas.getByRole("button", { name: /show more/i });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByRole("link", { name: "the orchid" })).toBeNull();
    await userEvent.click(more);
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("link", { name: "the orchid" })).toBeVisible();
  },
};

/** Typed HTML is shown as text, and unsafe links stay text too. */
export const DescriptionWithHtml: Story = {
  args: {
    item: {
      ...meta.args.item,
      description: '<img src=x onerror="alert(1)"> and [a trick](javascript:alert(1))',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/<img src=x/)).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "a trick" })).toBeNull();
  },
};

/** "Please don't buy" entries can say why. */
export const NotWantedWithDescription: Story = {
  args: {
    purchase: "hidden",
    item: {
      ...meta.args.item,
      name: "More mugs",
      url: null,
      category: null,
      not_wanted: true,
      description: "We have *more than enough* already.",
    },
  },
};
