import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSantaCandidate } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { SecretSantaForm } from "./SecretSantaForm.tsx";

const person = (id: string, name: string): SecretSantaCandidate => ({
  profile_id: id as ProfileId,
  display_name: name,
});
const people = [person("ann", "Ann"), person("bo", "Bo"), person("cleo", "Cleo")];

const meta = {
  title: "Groups/SecretSantaForm",
  component: SecretSantaForm,
  args: {
    occasions: [
      { id: "1", group_id: "group-1", name: "Christmas 2026", date: "2026-12-25" },
      { id: "2", group_id: "group-1", name: "New Year 2027", date: "2027-01-01" },
    ] as Occasion[],
    candidates: people,
    busy: false,
    cancelHref: "/groups/group-1",
    onSubmit: fn(),
  },
} satisfies Meta<typeof SecretSantaForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The occasion is chosen first (the soonest to start with). Everyone who can take part is ticked. Exclusions are optional, one way, per person. */
export const Default: Story = {};

/** Open one person's exclusions: who they must not draw. */
export const SettingExclusions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByText(/^Ann:/);
    await userEvent.click(summary);
    // "Bo" is also ticked as a participant, so look inside Ann's exclusions.
    const anns = within(summary.closest("details")!);
    await userEvent.click(anns.getByRole("checkbox", { name: "Bo" }));
    await expect(summary).toHaveTextContent(t("secretSanta.excludedCount", { count: 1 }));
  },
};

/** Fewer than 2 people ticked: the draw can't start, and the form says why. */
export const TooFewPeople: Story = {
  args: { candidates: [person("ann", "Ann")] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: t("secretSanta.draw") })).toBeDisabled();
    await expect(canvas.getByText(t("secretSanta.needTwo"))).toBeVisible();
  },
};

/** The draw is on its way. */
export const Drawing: Story = { args: { busy: true } };

/** No draw was possible: the reason shows by the button, so the manager can change the exclusions. */
export const CouldNotStart: Story = {
  args: {
    error:
      "No draw is possible: too many exclusions for Cleo. Remove some exclusions and try again.",
  },
};

const more = [
  ...people,
  person("dan", "Dan"),
  person("eva", "Eva"),
  person("fay", "Fay"),
  person("gus", "Gus"),
];

/** From 4 participants on, the minimum loop size can be picked: 2 up to half of them, or all. */
export const MinimumLoopSize: Story = {
  args: { candidates: more },
};
