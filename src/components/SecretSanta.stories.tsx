import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSanta as Draw, SecretSantaCandidate } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, OccasionId, ProfileId, SecretSantaId } from "../lib/ids.ts";
import { SecretSanta } from "./SecretSanta.tsx";

const makeOccasion = (id: string, name: string, date: string): Occasion => ({
  id: id as OccasionId,
  group_id: "group-1" as GroupId,
  name,
  date,
});
const person = (id: string, name: string): SecretSantaCandidate => ({
  profile_id: id as ProfileId,
  display_name: name,
});
const draw = (id: string, occasionId: string, extra: Partial<Draw> = {}): Draw => ({
  id: id as SecretSantaId,
  occasion_id: occasionId as OccasionId,
  taking_part: false,
  recipient_profile_id: null,
  recipient_name: null,
  ...extra,
});

const people = [
  person("ann", "Ann"),
  person("bo", "Bo"),
  person("cleo", "Cleo"),
  person("dan", "Dan"),
];

const meta = {
  title: "Groups/SecretSanta",
  component: SecretSanta,
  args: {
    today: "2026-10-21",
    isManager: false,
    occasions: [
      makeOccasion("1", "Christmas 2026", "2026-12-25"),
      makeOccasion("2", "Sinterklaas 2026", "2026-12-06"),
      makeOccasion("3", "Christmas 2025", "2025-12-25"),
    ],
    draws: [],
    candidates: people,
    participants: new Map(),
    busy: false,
    onStart: fn(async () => true),
    onRemove: fn(),
  },
} satisfies Meta<typeof SecretSanta>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Members only see occasions that have a draw: whether they take part, and who they drew. */
export const TakingPart: Story = {
  args: {
    draws: [
      draw("d1", "1", {
        taking_part: true,
        recipient_profile_id: "bo" as ProfileId,
        recipient_name: "Bo",
      }),
    ],
  },
};

/** A member the manager didn't pick sees no pair. */
export const NotTakingPart: Story = { args: { draws: [draw("d1", "1")] } };

/** With no draw for any upcoming occasion, a member has nothing to see: the card stays away. */
export const NothingForMembers: Story = {};

/** Managers get a Start button for every upcoming occasion without a draw. */
export const AsManager: Story = { args: { isManager: true } };

export const NoOccasions: Story = { args: { isManager: true, occasions: [] } };

/** Managers see who takes part, never who drew whom, and can remove people. */
export const ManagerWithRunningDraw: Story = {
  args: {
    isManager: true,
    draws: [
      draw("d1", "1", {
        taking_part: true,
        recipient_profile_id: "bo" as ProfileId,
        recipient_name: "Bo",
      }),
    ],
    participants: new Map([["d1" as SecretSantaId, people]]),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(t("secretSanta.participants", { count: 4 })));
    await userEvent.click(canvas.getByRole("button", { name: /Remove\s*Cleo/ }));
    await expect(args.onRemove).toHaveBeenCalledWith(args.draws[0], people[2]);
  },
};

/** Everyone who can take part is ticked. Exclusions are optional, one way, per person. */
export const StartingADraw: Story = {
  args: { isManager: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Start Secret Santa/ })[0]);
    await expect(await canvas.findByRole("button", { name: t("secretSanta.draw") })).toBeEnabled();
  },
};

/** Fewer than 2 people ticked: the draw can't start, and the form says why. */
export const TooFewPeople: Story = {
  args: { isManager: true, candidates: [person("ann", "Ann")] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Start Secret Santa/ })[0]);
    await expect(await canvas.findByRole("button", { name: t("secretSanta.draw") })).toBeDisabled();
    await expect(canvas.getByText(t("secretSanta.needTwo"))).toBeVisible();
  },
};

/** The draw is on its way. */
export const Drawing: Story = {
  args: { isManager: true, busy: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Start Secret Santa/ })[0]);
    await expect(
      await canvas.findByRole("button", { name: t("secretSanta.drawing") }),
    ).toBeDisabled();
  },
};
