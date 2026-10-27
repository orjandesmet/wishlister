import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSanta, SecretSantaCandidate } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, OccasionId, ProfileId, SecretSantaId } from "../lib/ids.ts";
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

const person = (id: string, name: string): SecretSantaCandidate => ({
  profile_id: id as ProfileId,
  display_name: name,
});
const people = [person("ann", "Ann"), person("bo", "Bo"), person("cleo", "Cleo")];
const draw = (occasionId: string, extra: Partial<SecretSanta> = {}): SecretSanta => ({
  id: `draw-${occasionId}` as SecretSantaId,
  occasion_id: occasionId as OccasionId,
  taking_part: false,
  recipient_profile_id: null,
  recipient_name: null,
  ...extra,
});
const secretSanta = {
  draws: [],
  isManager: false,
  candidates: people,
  participants: new Map(),
  busy: false,
  onStart: fn(async () => true),
  onRemove: fn(),
};
const youDrewBo = draw("1", {
  taking_part: true,
  recipient_profile_id: "bo" as ProfileId,
  recipient_name: "Bo",
});

/** A member who takes part sees who they drew under the occasion, with a link to their list. */
export const SecretSantaTakingPart: Story = {
  args: { secretSanta: { ...secretSanta, draws: [youDrewBo] } },
};

/** A member the manager didn't pick sees no pair. */
export const SecretSantaNotTakingPart: Story = {
  args: { secretSanta: { ...secretSanta, draws: [draw("1")] } },
};

/** Members see nothing about an occasion that has no draw. */
export const SecretSantaNoneForMembers: Story = { args: { secretSanta } };

/** Managers get a "Start Secret Santa" link button under every upcoming occasion without a draw. */
export const SecretSantaAsManager: Story = {
  args: { canEdit: true, secretSanta: { ...secretSanta, isManager: true } },
};

/** Managers see who takes part, never who drew whom, and can remove people. */
export const SecretSantaManagerWithRunningDraw: Story = {
  args: {
    canEdit: true,
    secretSanta: {
      ...secretSanta,
      isManager: true,
      draws: [youDrewBo],
      participants: new Map([["draw-1" as SecretSantaId, people]]),
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(t("secretSanta.participants", { count: 3 })));
    await userEvent.click(canvas.getByRole("button", { name: /Remove\s*Cleo/ }));
    await expect(args.secretSanta?.onRemove).toHaveBeenCalledWith(youDrewBo, people[2]);
  },
};

/** The link button opens the form: everyone who can take part is ticked, exclusions are optional. */
export const SecretSantaStarting: Story = {
  args: { canEdit: true, secretSanta: { ...secretSanta, isManager: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Start Secret Santa/ })[0]);
    await expect(await canvas.findByRole("button", { name: t("secretSanta.draw") })).toBeEnabled();
  },
};

/** Fewer than 2 people ticked: the draw can't start, and the form says why. */
export const SecretSantaTooFewPeople: Story = {
  args: {
    canEdit: true,
    secretSanta: { ...secretSanta, isManager: true, candidates: [person("ann", "Ann")] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Start Secret Santa/ })[0]);
    await expect(await canvas.findByRole("button", { name: t("secretSanta.draw") })).toBeDisabled();
    await expect(canvas.getByText(t("secretSanta.needTwo"))).toBeVisible();
  },
};

/** The draw is on its way. */
export const SecretSantaDrawing: Story = {
  args: { canEdit: true, secretSanta: { ...secretSanta, isManager: true, busy: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Start Secret Santa/ })[0]);
    await expect(
      await canvas.findByRole("button", { name: t("secretSanta.drawing") }),
    ).toBeDisabled();
  },
};

/** No draw was possible: the reason shows by the button, so the manager can change the exclusions. */
export const SecretSantaCouldNotStart: Story = {
  args: {
    canEdit: true,
    secretSanta: {
      ...secretSanta,
      isManager: true,
      error:
        "No draw is possible: too many exclusions for Cleo. Remove some exclusions and try again.",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Start Secret Santa/ })[0]);
    await expect(await canvas.findByText(/too many exclusions for Cleo/)).toBeInTheDocument();
  },
};
