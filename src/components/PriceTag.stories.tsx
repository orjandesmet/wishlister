import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, mocked, within } from "storybook/test";
import { displayCurrency, exchangeRates } from "../lib/currency.ts";
import { PriceTag } from "./PriceTag.tsx";

// Rates as they might be on a given day, so the converted amount doesn't need the network.
const rates = { EUR: 1, USD: 1.08, GBP: 0.85 };

const meta = {
  title: "Wishlist/PriceTag",
  component: PriceTag,
  args: { amount: 49.99, currency: "EUR" },
  argTypes: {
    currency: { control: "inline-radio", options: ["EUR", "USD", "GBP"] },
  },
  beforeEach: () => {
    mocked(displayCurrency).mockReturnValue("EUR");
    mocked(exchangeRates).mockReturnValue(rates);
  },
} satisfies Meta<typeof PriceTag>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In your own currency: the amount alone. */
export const Default: Story = {};

/** In another currency: roughly what that is in yours, too. */
export const Converted: Story = {
  args: { amount: 59.99, currency: "USD" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/≈/)).toBeVisible();
  },
};

/** Without today's rates (offline, say), the shop's price alone. */
export const NoRates: Story = {
  args: { amount: 59.99, currency: "USD" },
  beforeEach: () => {
    mocked(exchangeRates).mockReturnValue(null);
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/≈/)).toBeNull();
  },
};

/** Smaller, on a compact card and in the table. */
export const Small: Story = { args: { amount: 59.99, currency: "USD", small: true } };
