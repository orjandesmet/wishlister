import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { SecretSantaRibbon } from "./SecretSantaRibbon.tsx";

const meta = {
  title: "Groups/SecretSantaRibbon",
  component: SecretSantaRibbon,
} satisfies Meta<typeof SecretSantaRibbon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the list of the person you drew. Only you see it. */
export const Default: Story = {};

/** Says which occasion it's for on hover, and to screen readers. */
export const ForAnOccasion: Story = { args: { occasion: "Christmas 2026" } };

/** In the list menu and on the group card: just a red Santa, no backdrop. Screen readers still hear "Your Secret Santa". */
export const IconOnly: Story = { args: { iconOnly: true } };
