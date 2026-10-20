import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { CategoryChips } from "./CategoryChips.tsx";

const meta = {
  title: "Wishlist/CategoryChips",
  component: CategoryChips,
  args: {
    categories: ["Books", "Clothes", "Toys", "Games", "Music", "Experiences", "Home", "Sports"],
    onPick: fn(),
  },
} satisfies Meta<typeof CategoryChips>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new account: only the starter set. */
export const StarterSet: Story = {};

/** Filtered while typing "bo". */
export const Filtered: Story = { args: { categories: ["Board games", "Books"] } };

/** Nothing matches, so nothing shows. */
export const Empty: Story = { args: { categories: [] } };
