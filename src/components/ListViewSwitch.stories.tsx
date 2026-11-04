import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ListViewSwitch } from "./ListViewSwitch.tsx";

const meta = {
  title: "App/ListViewSwitch",
  component: ListViewSwitch,
  args: { value: "full", onChange: fn() },
} satisfies Meta<typeof ListViewSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On wide screens, in place of the Compact button. */
export const Full: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Full cards" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Table" }));
    await expect(args.onChange).toHaveBeenCalledWith("table");
  },
};

export const Compact: Story = { args: { value: "compact" } };

export const Table: Story = { args: { value: "table" } };
