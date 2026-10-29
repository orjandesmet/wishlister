import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { CompactToggle } from "./CompactToggle.tsx";

const meta = {
  title: "App/CompactToggle",
  component: CompactToggle,
  args: { on: false, onChange: fn() },
} satisfies Meta<typeof CompactToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Beside Select and the sort menu, above the list. */
export const Off: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Compact" });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

export const On: Story = { args: { on: true } };

/** On a phone only the icon shows: the one for the current state. */
export const Phone: Story = { globals: { viewport: { value: "mobile1" } } };
