import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { GroupId, OccasionId } from "../lib/ids.ts";
import { Occasions } from "./Occasions.tsx";

const makeOccasion = (id: string, name: string, date: string): Occasion => ({
  id: id as OccasionId,
  group_id: "group-1" as GroupId,
  name,
  date,
});

const meta = {
  title: "Groups/Occasions",
  component: Occasions,
  args: {
    today: "2026-10-21",
    canEdit: false,
    occasions: [
      makeOccasion("1", "Christmas 2026", "2026-12-25"),
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

const secretSanta = { group: "group-1" as GroupId, canStart: false };

/** With a Secret Santa running, everyone gets the one button, naming its occasion. */
export const SecretSantaRunning: Story = {
  args: {
    secretSanta: { ...secretSanta, running: makeOccasion("1", "Christmas 2026", "2026-12-25") },
  },
};

/** Members get no button when nothing runs. */
export const SecretSantaNoneForMembers: Story = { args: { secretSanta } };

/** Managers get one "Start Secret Santa" button: the occasion is picked on its page. */
export const SecretSantaAsManager: Story = {
  args: { canEdit: true, secretSanta: { ...secretSanta, canStart: true } },
};
