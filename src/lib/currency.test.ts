import { describe, expect, it } from "vite-plus/test";
import { convertAmount, formatPrice, parsePriceInput } from "./currency.ts";

describe("convertAmount", () => {
  const rates = { EUR: 1, USD: 1.1, GBP: 0.85 };

  it("converts through the euro", () => {
    expect(convertAmount(10, "EUR", "USD", rates)).toBeCloseTo(11);
    expect(convertAmount(11, "USD", "EUR", rates)).toBeCloseTo(10);
    expect(convertAmount(11, "USD", "GBP", rates)).toBeCloseTo(8.5);
  });

  it("keeps the amount in the same currency, even without rates", () => {
    expect(convertAmount(10, "USD", "USD", null)).toBe(10);
  });

  it("gives null when a rate is missing", () => {
    expect(convertAmount(10, "XYZ", "EUR", rates)).toBeNull();
    expect(convertAmount(10, "EUR", "USD", null)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("follows the language", () => {
    expect(formatPrice(1299.5, "EUR", "en")).toBe("€1,299.50");
    expect(formatPrice(1299.5, "EUR", "nl").replace(/\s/g, " ")).toBe("€ 1.299,50");
  });

  it("falls back to the code for an unknown currency", () => {
    expect(formatPrice(5, "not a currency", "en")).toBe("5.00 not a currency");
  });
});

describe("parsePriceInput", () => {
  it("reads typed prices with a comma or a point", () => {
    expect(parsePriceInput("12")).toBe(12);
    expect(parsePriceInput("12,5")).toBe(12.5);
    expect(parsePriceInput(" 12.50 ")).toBe(12.5);
    expect(parsePriceInput("1.299,00")).toBe(1299);
    expect(parsePriceInput("1,299.99")).toBe(1299.99);
  });

  it("gives null for blank and NaN for anything else", () => {
    expect(parsePriceInput("  ")).toBeNull();
    expect(parsePriceInput("abc")).toBeNaN();
    expect(parsePriceInput("0")).toBeNaN();
    expect(parsePriceInput("-5")).toBeNaN();
  });
});
