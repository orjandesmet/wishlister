import { createMemo, createSignal } from "solid-js";
import type { Item } from "./api/items.ts";
import { convertAmount, exchangeRates } from "./currency.ts";
import { compareNames } from "./i18n.ts";
import {
  arrangeItems,
  effectiveListOrder,
  readListOrder,
  saveListOrder,
  type ListOrder,
} from "./listOrder.ts";

/** Splits a list into its ordered, categorised sections and the "please don't buy" entries. */
export function createListSections(
  items: () => Item[] | undefined,
  /** Whether bought items can be told apart, and which ones they are. */
  isBought: () => ((item: Item) => boolean) | undefined,
) {
  // The same choice on every list, remembered on this device.
  const [picked, setPicked] = createSignal<ListOrder | undefined>(readListOrder());
  const chooseOrder = (next: ListOrder) => {
    setPicked(next);
    saveListOrder(next);
  };
  // "Please don't buy" entries get their own section at the bottom, in the order added.
  const notWanted = createMemo(() => (items() ?? []).filter((item) => item.not_wanted));
  // "Most wanted first" is only offered when some wish is wanted more than "I want this".
  const hasWantLevels = createMemo(() =>
    (items() ?? []).some((item) => !item.not_wanted && item.want_level > 1),
  );
  const order = () => effectiveListOrder(picked(), hasWantLevels());
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
      wantOf: (i) => list[i].want_level,
    });
  });
  const isGrouped = () => sections().some((s) => s.category !== null);

  return { order, chooseOrder, hasWantLevels, sections, notWanted, isGrouped };
}
