import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { YouBoughtFor } from "./YouBoughtFor.tsx";

const meta = {
  title: "Wishlist/YouBoughtFor",
  component: YouBoughtFor,
  args: { occasion: "Christmas" },
} satisfies Meta<typeof YouBoughtFor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** In a narrow space it wraps between the sentence and the occasion, never inside either. */
export const Narrow: Story = {
  args: { occasion: "Anna's 40th birthday" },
  decorators: [
    (Story) => (
      <p style={{ width: "12rem", border: "1px dashed var(--muted)" }}>
        <Story />
      </p>
    ),
  ],
};
