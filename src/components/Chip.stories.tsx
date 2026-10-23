import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Chip, ChipButton, Chips } from "./Chip.tsx";
import { hueFor } from "../lib/hues.ts";

const meta = {
  title: "Foundations/Chip",
  component: Chip,
  args: { children: "Manager" },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A category keeps one hue wherever it shows up. */
export const Category: Story = { args: { children: "Toys", hue: hueFor("Toys") } };

/** Chips to tap; with aria-pressed they toggle. */
export const Buttons: Story = {
  render: () => (
    <Chips>
      <ChipButton aria-pressed>All groups</ChipButton>
      <ChipButton aria-pressed={false}>Family</ChipButton>
      <ChipButton aria-pressed={false}>Book club</ChipButton>
    </Chips>
  ),
};
