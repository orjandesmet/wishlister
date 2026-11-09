import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ExternalLinkIcon } from "./ExternalLinkIcon.tsx";

const meta = {
  title: "Wishlist/ExternalLinkIcon",
  component: ExternalLinkIcon,
  // The icon fills what it's in; the item card and table size and colour it.
  decorators: [
    (Story) => (
      <span style={{ display: "inline-flex", width: "24px", color: "var(--muted)" }}>
        <Story />
      </span>
    ),
  ],
} satisfies Meta<typeof ExternalLinkIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
