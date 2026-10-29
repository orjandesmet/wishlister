import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { CardViewSetting } from "./CardViewSetting.tsx";

const meta = {
  title: "App/CardViewSetting",
  component: CardViewSetting,
  args: { view: "full", onChange: fn() },
} satisfies Meta<typeof CardViewSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the Settings page, under how groups collapse. */
export const Full: Story = {};

export const Compact: Story = { args: { view: "compact" } };
