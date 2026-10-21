import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { CurrencySelect } from "./CurrencySelect.tsx";

const meta = {
  title: "App/CurrencySelect",
  component: CurrencySelect,
  args: { value: "EUR", onChange: fn() },
} satisfies Meta<typeof CurrencySelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the account page, under the language. */
export const Default: Story = {};
