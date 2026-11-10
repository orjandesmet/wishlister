import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Toggle } from "./Toggle.tsx";

const meta = {
  title: "App/Toggle",
  component: Toggle,
  args: { label: "Show delivery on item cards", on: false, onChange: fn() },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The label sits on the left, the switch on the right. Clicking asks for the opposite state. */
export const Off: Story = {
  play: async ({ args, canvasElement }) => {
    const toggle = within(canvasElement).getByRole("switch", {
      name: "Show delivery on item cards",
    });
    await expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

export const On: Story = {
  args: { on: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("switch")).toBeChecked();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("switch"));
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** The theme setting. */
export const Theme: Story = { args: { label: "Dark theme", on: true } };

/** A long label wraps without squeezing the switch. */
export const LongLabel: Story = {
  args: {
    label:
      "Show whether each item has been delivered directly on its card, as well as in the overview",
  },
  globals: { viewport: { value: "mobile1" } },
};
