import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { QuickAdd } from "./QuickAdd.tsx";

const meta = {
  title: "Wishlist/QuickAdd",
  component: QuickAdd,
  args: {
    pending: [],
    retrying: false,
    onAdd: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof QuickAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just the field: type a name and press Enter. */
export const Empty: Story = {};

/** Typed items wait a few seconds, then save together. */
export const Saving: Story = {
  args: {
    pending: [
      { key: 0, name: "Warm socks" },
      { key: 1, name: "A good thriller" },
    ],
  },
};

/** Saving failed: it tries again by itself, or you cancel and the items go away. */
export const Retrying: Story = {
  args: { ...Saving.args, retrying: true },
};
