import type { Meta, StoryObj } from "storybook-solidjs-vite";
import type { ProfileId } from "../lib/ids.ts";
import { TabBar } from "./TabBar.tsx";

const meta = {
  title: "App/TabBar",
  component: TabBar,
  parameters: { layout: "fullscreen" },
  args: { myProfileId: "me" as ProfileId },
} satisfies Meta<typeof TabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A phone: each icon sits above its small label. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** The smallest phones: the same tabs, still readable. */
export const SmallestPhone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

/** Wide screens: a sidebar with the name and the icon beside each label. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};
