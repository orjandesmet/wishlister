import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { CleanupDialog } from "./CleanupDialog.tsx";
import type { CleanupItem } from "../lib/api/cleanup.ts";
import type { ItemId } from "../lib/ids.ts";

const item = (id: string, name: string, occasion: string, date: string): CleanupItem => ({
  item_id: id as ItemId,
  item_name: name,
  occasion_name: occasion,
  occasion_date: date,
});

const meta = {
  title: "Wishlist/CleanupDialog",
  component: CleanupDialog,
  args: {
    items: [
      item("1", "LEGO Botanical bonsai tree", "Sinterklaas", "2026-12-06"),
      item("2", "Wool socks", "Christmas 2026", "2026-12-25"),
      item("3", "The Hobbit (illustrated edition)", "Christmas 2026", "2026-12-25"),
    ],
    onDone: fn(),
  },
} satisfies Meta<typeof CleanupDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens by itself on your own list, the day after an occasion. Every item is checked. */
export const OwnList: Story = {};

/** A parent on their child's list. */
export const ChildList: Story = { args: { childName: "Tom" } };

export const Saving: Story = { args: { busy: true } };

export const Failed: Story = { args: { error: "Couldn't reach the server." } };
