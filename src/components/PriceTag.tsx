import { Show } from "solid-js";
import { convertAmount, displayCurrency, exchangeRates, formatPrice } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import styles from "./PriceTag.module.css";

/**
 * The item's price as the shop showed it, and roughly what that is in your
 * currency when it's another one.
 */
export function PriceTag(props: { amount: number; currency: string; small?: boolean }) {
  const converted = () => {
    if (props.currency === displayCurrency()) return null;
    const amount = convertAmount(props.amount, props.currency, displayCurrency(), exchangeRates());
    return amount === null ? null : formatPrice(amount, displayCurrency(), locale());
  };
  return (
    <p class={styles.price} classList={{ [styles.small]: props.small }}>
      <span class={styles.amount}>{formatPrice(props.amount, props.currency, locale())}</span>
      <Show when={converted()}>
        {(price) => (
          <span class={styles.converted}>{t("item.convertedPrice", { price: price() })}</span>
        )}
      </Show>
    </p>
  );
}
