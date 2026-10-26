import type { Meta, StoryObj } from "storybook-solidjs-vite";
import type { ProfileId } from "../lib/ids.ts";
import { ListMenu } from "./ListMenu.tsx";

const meta = {
  title: "Wishlist/ListMenu",
  component: ListMenu,
  args: {
    value: "me" as ProfileId,
    sections: [
      {
        options: [
          { id: "me" as ProfileId, name: "My list", person: "Orjan" },
          { id: "lucas" as ProfileId, name: "Lucas's wishlist", person: "Lucas" },
          { id: "mila" as ProfileId, name: "Mila's wishlist", person: "Mila" },
        ],
      },
      {
        title: "Family",
        options: [
          { id: "ann" as ProfileId, name: "Ann", person: "Ann" },
          { id: "grandpa" as ProfileId, name: "Grandpa", person: "Grandpa" },
        ],
      },
      {
        title: "Friends",
        options: [
          { id: "ann" as ProfileId, name: "Ann", person: "Ann" },
          { id: "bo" as ProfileId, name: "Bo", person: "Bo" },
        ],
      },
    ],
  },
} satisfies Meta<typeof ListMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the chevron to open the menu. */
export const OwnList: Story = {};

export const ChildsList: Story = { args: { value: "lucas" as ProfileId } };

/** Someone in two groups is listed under both, and marked as open in both. */
export const GroupMembersList: Story = { args: { value: "ann" as ProfileId } };

/** No children: your own list on top, then the groups. */
export const NoChildren: Story = {
  args: {
    sections: [
      { options: [{ id: "me" as ProfileId, name: "My list", person: "Orjan" }] },
      {
        title: "Family",
        options: [{ id: "ann" as ProfileId, name: "Ann", person: "Ann" }],
      },
    ],
  },
};
