import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { CleanupDone, CleanupPrompt } from "./CleanupPrompt.tsx";

const meta = {
  title: "Wishlist/CleanupPrompt",
  component: CleanupPrompt,
  args: {
    occasion: "Christmas 2026",
    count: 3,
    onRemove: fn(),
    onKeep: fn(),
  },
} satisfies Meta<typeof CleanupPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On your own list, the day after the occasion. */
export const OwnList: Story = {};

export const OneItem: Story = { args: { count: 1 } };

/** Some items are marked "keep on my list": they stay, only their bought mark goes. */
export const WithKeptItems: Story = { args: { hasKeptItems: true } };

/** A parent on their child's list. */
export const ChildList: Story = { args: { childName: "Tom" } };

export const Busy: Story = { args: { busy: true } };

/** Right after Remove, with an undo. */
export const Done: StoryObj<typeof CleanupDone> = {
  render: (args) => <CleanupDone {...args} />,
  args: { count: 3, onUndo: fn(), onDismiss: fn() },
};
