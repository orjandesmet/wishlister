import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { CompactCardsSetting } from "./CompactCardsSetting.tsx";

const meta = {
  title: "App/CompactCardsSetting",
  component: CompactCardsSetting,
  args: { on: false, onChange: fn() },
} satisfies Meta<typeof CompactCardsSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the Settings page, under the seasonal themes. */
export const Default: Story = {};

export const SwitchedOn: Story = { args: { on: true } };
