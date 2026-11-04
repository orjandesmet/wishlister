import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { SecretSanta, SecretSantaCandidate } from "../../lib/api/secretSanta.ts";
import type { OccasionId, ProfileId, SecretSantaId } from "../../lib/ids.ts";
import { SecretSantaStatus } from "./SecretSantaStatus.tsx";

const person = (id: string, name: string): SecretSantaCandidate => ({
  profile_id: id as ProfileId,
  display_name: name,
});
const people = [person("ann", "Ann"), person("bo", "Bo"), person("cleo", "Cleo")];
const draw: SecretSanta = {
  id: "draw-1" as SecretSantaId,
  occasion_id: "1" as OccasionId,
  taking_part: true,
  recipient_profile_id: "bo" as ProfileId,
  recipient_name: "Bo",
};

const meta = {
  title: "SecretSanta/SecretSantaStatus",
  component: SecretSantaStatus,
  args: { draw, isManager: false, participants: [], onRemove: fn() },
} satisfies Meta<typeof SecretSantaStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A member who takes part sees who they drew, with a link to their list. */
export const TakingPart: Story = {};

/** A member the manager didn't pick sees no pair. */
export const NotTakingPart: Story = {
  args: { draw: { ...draw, taking_part: false, recipient_profile_id: null, recipient_name: null } },
};

/** Managers see who takes part, never who drew whom, and can remove people. */
export const AsManager: Story = {
  args: { isManager: true, participants: people },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Remove\s*Cleo/ }));
    await expect(args.onRemove).toHaveBeenCalledWith(draw, people[2]);
  },
};
