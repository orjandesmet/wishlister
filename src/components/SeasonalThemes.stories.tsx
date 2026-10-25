import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { SeasonalThemes } from "./SeasonalThemes.tsx";

const meta = {
  title: "App/SeasonalThemes",
  component: SeasonalThemes,
  args: { on: true, onChange: fn() },
} satisfies Meta<typeof SeasonalThemes>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the Settings page, under the currency. */
export const Default: Story = {};

/** On a themed day it says which theme is showing. */
export const OnChristmas: Story = { args: { today: "christmas" } };

export const SwitchedOff: Story = { args: { on: false, today: "christmas" } };
