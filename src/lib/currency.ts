import { createSignal } from "solid-js";

/**
 * Prices are stored in the currency the shop showed. The app shows each price as
 * it was, plus roughly what that is in the currency you picked on the account
 * page ("≈ € 45,90"), using the European Central Bank's daily rates through
 * Frankfurter (https://frankfurter.dev: free, no key, allows browser requests).
 *
 * Like i18n.ts, module-level signals and no Supabase, so components can use it
 * without a provider and Storybook works.
 */

/** The currencies the ECB publishes rates for, so every one of them can be converted. */
export const currencies = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "ISK",
  "TRY",
  "JPY",
  "CNY",
  "HKD",
  "KRW",
  "SGD",
  "INR",
  "IDR",
  "MYR",
  "PHP",
  "THB",
  "AUD",
  "NZD",
  "CAD",
  "MXN",
  "BRL",
  "ILS",
  "ZAR",
];

/** How many of a currency one euro buys. EUR itself is 1. */
export type Rates = Record<string, number>;

const currencyKey = "currency";
const ratesKey = "exchange-rates";
/** The ECB publishes once a working day, so twelve hours is fresh enough. */
const RATES_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=EUR";

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}

const savedCurrency = readStorage(currencyKey);
const [displayCurrency, setDisplayCurrencySignal] = createSignal(
  savedCurrency && currencies.includes(savedCurrency) ? savedCurrency : "EUR",
);

/** The currency you want prices converted to. Reading it in JSX follows changes. */
export { displayCurrency };

/** Picks the currency prices are converted to, remembered on this device. */
export function setDisplayCurrency(next: string) {
  setDisplayCurrencySignal(next);
  writeStorage(currencyKey, next);
}

type SavedRates = { fetchedAt: number; rates: Rates };

function readSavedRates(): SavedRates | null {
  try {
    const saved = JSON.parse(readStorage(ratesKey) ?? "null") as SavedRates | null;
    return saved && typeof saved.fetchedAt === "number" && saved.rates ? saved : null;
  } catch {
    return null;
  }
}

const [rates, setRates] = createSignal<Rates | null>(readSavedRates()?.rates ?? null);
let loading = false;

/**
 * Today's rates, or null until they're loaded (or when they can't be). The first
 * call loads them when the saved ones are missing or old; it never throws, so
 * without a network prices just show without the converted amount.
 */
export function exchangeRates(): Rates | null {
  if (!loading && (readSavedRates()?.fetchedAt ?? 0) < Date.now() - RATES_MAX_AGE_MS) {
    loading = true;
    void fetch(RATES_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { rates?: Rates } | null) => {
        if (!body?.rates) return;
        const fresh = { ...body.rates, EUR: 1 };
        setRates(fresh);
        writeStorage(ratesKey, JSON.stringify({ fetchedAt: Date.now(), rates: fresh }));
      })
      .catch(() => undefined);
  }
  return rates();
}

/** The amount in another currency, or null when a rate is missing. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Rates | null,
): number | null {
  if (from === to) return amount;
  const fromRate = from === "EUR" ? 1 : rates?.[from];
  const toRate = to === "EUR" ? 1 : rates?.[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

/** "€ 49,99" or "€49.99", following the language. Unknown codes show as "49.99 XYZ". */
export function formatPrice(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Reads a price typed in the item form: "12", "12.5", "12,50" or "1.299,00".
 * Blank gives null; anything else that isn't a positive amount gives NaN.
 */
export function parsePriceInput(text: string): number | null {
  const trimmed = text.trim().replace(/\s/g, "");
  if (trimmed === "") return null;
  // The last separator is the decimal one when 1 or 2 digits follow it.
  const decimal = trimmed.match(/[.,](\d{1,2})$/);
  const whole = decimal ? trimmed.slice(0, -decimal[0].length) : trimmed;
  const normalised = whole.replace(/[.,]/g, "") + (decimal ? `.${decimal[1]}` : "");
  if (!/^\d+(\.\d+)?$/.test(normalised)) return NaN;
  const value = Math.round(Number(normalised) * 100) / 100;
  return value > 0 ? value : NaN;
}
