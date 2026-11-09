import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { HeartIcon } from "./HeartIcon.tsx";

const meta = {
  title: "Wishlist/HeartIcon",
  component: HeartIcon,
  // The icon fills what it's in; the item card and table size and colour it.
  decorators: [
    (Story) => (
      <span style={{ display: "inline-flex", width: "24px", color: "var(--danger)" }}>
        <Story />
      </span>
    ),
  ],
} satisfies Meta<typeof HeartIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
