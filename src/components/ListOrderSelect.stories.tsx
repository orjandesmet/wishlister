import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { ListOrderSelect } from "./ListOrderSelect.tsx";

const meta = {
  title: "Wishlist/ListOrderSelect",
  component: ListOrderSelect,
  args: { value: "added", showBought: false, showWanted: false, onChange: fn() },
} satisfies Meta<typeof ListOrderSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Your own list: no bought option. */
export const OwnList: Story = {};

/** Someone else's list, grouped by category. */
export const OtherList: Story = { args: { showBought: true, value: "category" } };

/** Something on the list is wanted more than the rest: "Most wanted first" is offered, and picked. */
export const WithWantedLevels: Story = {
  args: { showBought: true, showWanted: true, value: "wanted" },
};
