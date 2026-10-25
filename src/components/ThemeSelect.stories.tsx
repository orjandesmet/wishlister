import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { ThemeSelect } from "./ThemeSelect.tsx";

const meta = {
  title: "App/ThemeSelect",
  component: ThemeSelect,
  args: { value: "default", keepMine: false, onChange: fn(), onKeepMineChange: fn() },
} satisfies Meta<typeof ThemeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the account page, under the currency. */
export const Default: Story = {};

/** A group's Christmas is coming up, so its theme shows for now. */
export const DuringAnOccasion: Story = {
  args: { occasion: { name: "Christmas 2026", date: "2026-12-25", theme: "christmas" } },
};

/** Keeps the birthday theme, whatever the groups plan. */
export const KeepingMine: Story = {
  args: {
    value: "birthday",
    keepMine: true,
    occasion: { name: "Christmas 2026", date: "2026-12-25", theme: "christmas" },
  },
};
