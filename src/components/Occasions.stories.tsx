import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { GroupId, OccasionId } from "../lib/ids.ts";
import { Occasions } from "./Occasions.tsx";

const makeOccasion = (
  id: string,
  name: string,
  date: string,
  theme: Occasion["theme"] = null,
): Occasion => ({
  id: id as OccasionId,
  group_id: "group-1" as GroupId,
  name,
  date,
  theme,
});

const meta = {
  title: "Groups/Occasions",
  component: Occasions,
  args: {
    today: "2026-10-21",
    canEdit: false,
    occasions: [
      makeOccasion("1", "Christmas 2026", "2026-12-25", "christmas"),
      makeOccasion("2", "Sinterklaas 2026", "2026-12-06"),
      makeOccasion("3", "Easter 2027", "2027-03-28"),
      makeOccasion("4", "Christmas 2025", "2025-12-25"),
    ],
    onAdd: fn(async () => true),
    onUpdate: fn(async () => true),
    onDelete: fn(),
  },
} satisfies Meta<typeof Occasions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Members only read them. Past occasions are folded away. */
export const AsMember: Story = {};

/** Managers can add, edit and delete. */
export const AsManager: Story = { args: { canEdit: true } };

export const NoneYet: Story = { args: { canEdit: true, occasions: [] } };
