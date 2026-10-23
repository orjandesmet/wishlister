import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Check } from "./Check.tsx";

const meta = {
  title: "Foundations/Check",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checkbox: Story = {
  render: () => (
    <Check>
      <input type="checkbox" checked />
      Please don't buy this
    </Check>
  ),
};

export const Radios: Story = {
  render: () => (
    <fieldset>
      <legend>Visible in</legend>
      <Check>
        <input type="radio" name="visibility" checked />
        All groups
      </Check>
      <Check>
        <input type="radio" name="visibility" />
        No groups (only me)
      </Check>
    </fieldset>
  ),
};
