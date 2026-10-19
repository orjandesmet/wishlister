import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { InstallBanner } from "./InstallBanner.tsx";

const meta = {
  title: "App/InstallBanner",
  component: InstallBanner,
  args: { mode: "prompt", onInstall: fn(), onDismiss: fn() },
  argTypes: { mode: { control: "inline-radio", options: ["prompt", "ios"] } },
} satisfies Meta<typeof InstallBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Android and other Chromium browsers: the button opens the browser's install dialog. */
export const Prompt: Story = {};

/** iOS has no install dialog, so the banner explains the share menu instead. */
export const Ios: Story = { args: { mode: "ios" } };
