import { createMemo, createSignal } from "solid-js";
import type { Item } from "./api/items.ts";
import { convertAmount, exchangeRates } from "./currency.ts";
import { compareNames } from "./i18n.ts";
import { arrangeItems, readListOrder, saveListOrder, type ListOrder } from "./listOrder.ts";

/** Splits a list into its ordered, categorised sections and the "please don't buy" entries. */
export function createListSections(
  items: () => Item[] | undefined,
  /** Whether bought items can be told apart, and which ones they are. */
  isBought: () => ((item: Item) => boolean) | undefined,
) {
  // The same choice on every list, remembered on this device.
  const [order, setOrder] = createSignal<ListOrder>(readListOrder());
  const chooseOrder = (next: ListOrder) => {
    setOrder(next);
    saveListOrder(next);
  };
  // "Please don't buy" entries get their own section at the bottom, in the order added.
  const notWanted = createMemo(() => (items() ?? []).filter((item) => item.not_wanted));
  const sections = createMemo(() => {
    const list = (items() ?? []).filter((item) => !item.not_wanted);
    const bought = isBought();
    const rates = exchangeRates();
    return arrangeItems(list, order(), {
      compare: compareNames,
      isBought: bought ? (i) => bought(list[i]) : undefined,
      // Compared in euros, so prices in other currencies sort where they belong.
      priceOf: (i) => {
        const { price, price_currency } = list[i];
        if (price === null || !price_currency) return null;
        return convertAmount(price, price_currency, "EUR", rates);
      },
    });
  });
  const isGrouped = () => sections().some((s) => s.category !== null);

  return { order, chooseOrder, sections, notWanted, isGrouped };
}
