import type { Meta, StoryObj } from "storybook-solidjs-vite";
import type { ProfileId } from "../lib/ids.ts";
import { ListMenu } from "./ListMenu.tsx";

const meta = {
  title: "Wishlist/ListMenu",
  component: ListMenu,
  args: {
    value: "me" as ProfileId,
    options: [
      { id: "me" as ProfileId, name: "My list", person: "Orjan" },
      { id: "lucas" as ProfileId, name: "Lucas's wishlist", person: "Lucas" },
      { id: "mila" as ProfileId, name: "Mila's wishlist", person: "Mila" },
    ],
  },
} satisfies Meta<typeof ListMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the chevron to open the menu. */
export const OwnList: Story = {};

export const ChildsList: Story = { args: { value: "lucas" as ProfileId } };
