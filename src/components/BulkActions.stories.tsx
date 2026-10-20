import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { suggestCategories } from "../lib/categories.ts";
import type { GroupId } from "../lib/ids.ts";
import { BulkActions } from "./BulkActions.tsx";

const meta = {
  title: "Wishlist/BulkActions",
  component: BulkActions,
  args: {
    selected: 3,
    total: 8,
    groups: [
      { id: "group-1" as GroupId, name: "Family" },
      { id: "group-2" as GroupId, name: "Book club" },
    ],
    suggestCategories: (typed: string) =>
      suggestCategories(["Books", "Books", "Toys"], ["Clothes", "Games", "Music"], typed),
    busy: false,
    onSelectAll: fn(),
    onSelectNone: fn(),
    onSetCategory: fn(),
    onSetGroups: fn(),
    onDelete: fn(),
    onDone: fn(),
  },
} satisfies Meta<typeof BulkActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Some items ticked: tap Category or Groups to open their form in the bar. */
export const SomeSelected: Story = {};

/** Nothing ticked yet: the actions wait until you pick an item. */
export const NothingSelected: Story = { args: { selected: 0 } };

/** Everything ticked: the link turns into "Select none". */
export const AllSelected: Story = { args: { selected: 8 } };

/** An action is saving. */
export const Busy: Story = { args: { busy: true } };
