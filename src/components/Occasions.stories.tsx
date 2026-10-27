import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSanta } from "../lib/api/secretSanta.ts";
import type { GroupId, OccasionId, SecretSantaId } from "../lib/ids.ts";
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

const draw = (occasionId: string, extra: Partial<SecretSanta> = {}): SecretSanta => ({
  id: `draw-${occasionId}` as SecretSantaId,
  occasion_id: occasionId as OccasionId,
  taking_part: false,
  recipient_profile_id: null,
  recipient_name: null,
  ...extra,
});
const secretSanta = { draws: [], isManager: false };

/** With a Secret Santa running, a member gets a link to its page: who they drew is there. */
export const SecretSantaRunning: Story = {
  args: { secretSanta: { ...secretSanta, draws: [draw("1")] } },
};

/** Members see nothing about an occasion that has no draw. */
export const SecretSantaNoneForMembers: Story = { args: { secretSanta } };

/** Managers get a "Start Secret Santa" link under every upcoming occasion without a draw. */
export const SecretSantaAsManager: Story = {
  args: { canEdit: true, secretSanta: { ...secretSanta, isManager: true } },
};

/** Where one runs, the link leads to its page instead, where they can remove people. */
export const SecretSantaManagerWithRunningDraw: Story = {
  args: { canEdit: true, secretSanta: { ...secretSanta, isManager: true, draws: [draw("1")] } },
};
