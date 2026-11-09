import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  convertAmount,
  exchangeRates,
  formatPrice,
  setDisplayCurrency,
  type Rates,
} from "../lib/currency.ts";
import { PriceTag } from "./PriceTag.tsx";

// Today's rates come from the network; here they're fixed.
vi.mock(import("../lib/currency.ts"), async (original) => ({
  ...(await original()),
  exchangeRates: vi.fn(),
}));

const rates: Rates = { EUR: 1, USD: 1.08 };

beforeEach(() => {
  setDisplayCurrency("EUR");
  vi.mocked(exchangeRates).mockReturnValue(rates);
});
afterEach(() => document.body.replaceChildren());

function mount(props: { amount: number; currency: string; small?: boolean }) {
  const host = document.body.appendChild(document.createElement("div"));
  render(() => <PriceTag {...props} />, host);
  const spans = [...host.querySelectorAll("p > span")];
  return { tag: host.querySelector("p")!, amount: spans[0], converted: spans[1] };
}

describe("PriceTag", () => {
  it("shows the amount alone in your own currency", () => {
    const { amount, converted } = mount({ amount: 49.99, currency: "EUR" });
    expect(amount.textContent).toBe(formatPrice(49.99, "EUR", "en"));
    expect(converted).toBeUndefined();
  });

  it("adds roughly what it is in your currency for another one", () => {
    const { amount, converted } = mount({ amount: 59.99, currency: "USD" });
    expect(amount.textContent).toBe(formatPrice(59.99, "USD", "en"));
    const inEuro = convertAmount(59.99, "USD", "EUR", rates)!;
    expect(converted.textContent).toBe(`≈ ${formatPrice(inEuro, "EUR", "en")}`);
  });

  it("leaves the conversion out without rates", () => {
    vi.mocked(exchangeRates).mockReturnValue(null);
    expect(mount({ amount: 59.99, currency: "USD" }).converted).toBeUndefined();
  });

  it("follows a change of your currency", () => {
    const { converted } = mount({ amount: 59.99, currency: "USD" });
    expect(converted.isConnected).toBe(true);
    setDisplayCurrency("USD");
    expect(converted.isConnected).toBe(false);
  });

  it("is smaller only when asked", () => {
    const big = mount({ amount: 1, currency: "EUR" }).tag;
    const small = mount({ amount: 1, currency: "EUR", small: true }).tag;
    expect(small.classList.length).toBe(big.classList.length + 1);
  });
});
