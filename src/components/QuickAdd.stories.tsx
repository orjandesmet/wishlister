import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import type { GroupId } from "../lib/ids.ts";
import { QuickAdd } from "./QuickAdd.tsx";

const meta = {
  title: "Wishlist/QuickAdd",
  component: QuickAdd,
  args: {
    pending: [],
    retrying: false,
    groups: [
      { id: "group-1" as GroupId, name: "Family" },
      { id: "group-2" as GroupId, name: "Book club" },
    ],
    onAdd: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof QuickAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just the field: type a name and press Enter. New items are in no groups until you pick some. */
export const Empty: Story = {};

/** A list that isn't in any group yet: only "All groups" to pick. */
export const NoGroups: Story = { args: { groups: [] } };

/** Typed items wait a few seconds, then save together. */
export const Saving: Story = {
  args: {
    pending: [
      { key: 0, name: "Warm socks", data: undefined },
      { key: 1, name: "A good thriller", data: undefined },
    ],
  },
};

/** Saving failed: it tries again by itself, or you cancel and the items go away. */
export const Retrying: Story = {
  args: { ...Saving.args, retrying: true },
};
