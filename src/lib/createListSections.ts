import { createMemo, createSignal, onCleanup } from "solid-js";
import type { Item } from "./api/items.ts";
import type { ItemId } from "./ids.ts";
import { convertAmount, exchangeRates } from "./currency.ts";
import { compareNames } from "./i18n.ts";
import {
  arrangeItems,
  effectiveListOrder,
  readListOrder,
  saveListOrder,
  type ListOrder,
} from "./listOrder.ts";

/** How long a changed wanted level keeps its card in place, so it can be tapped again. */
export const holdMs = 1200;

/** Splits a list into its ordered, categorised sections and the "please don't buy" entries. */
export function createListSections(
  items: () => Item[] | undefined,
  /** Whether bought items can be told apart, and which ones they are. */
  isBought: () => ((item: Item) => boolean) | undefined,
  /** Applies the held cards' new places, e.g. animated (see animateMoves). */
  reorder: (apply: () => void) => void = (apply) => apply(),
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
  const hasWantedLevels = createMemo(() =>
    (items() ?? []).some((item) => !item.not_wanted && item.wanted_level > 1),
  );
  const order = () => effectiveListOrder(picked(), hasWantedLevels());

  // After a wanted level changes, "most wanted first" keeps sorting by the old level for a
  // moment, so the card stays under your finger for another tap. Each tap starts the wait again.
  const [held, setHeld] = createSignal<ReadonlyMap<ItemId, number>>(new Map());
  let release: ReturnType<typeof setTimeout> | undefined;
  const holdPlace = (item: Item) => {
    if (!held().has(item.id)) setHeld((map) => new Map(map).set(item.id, item.wanted_level));
    clearTimeout(release);
    release = setTimeout(() => reorder(() => setHeld(new Map())), holdMs);
  };
  onCleanup(() => clearTimeout(release));

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
      wantOf: (i) => held().get(list[i].id) ?? list[i].wanted_level,
    });
  });
  const isGrouped = () => sections().some((s) => s.category !== null);
  // The sections are new objects on every change; their categories are what stays the same,
  // so the page can keep each section (and its cards) instead of building them all again.
  const categories = createMemo(() => sections().map((s) => s.category));
  const itemsIn = (category: string | null) =>
    sections().find((s) => s.category === category)?.items ?? [];

  return {
    order,
    chooseOrder,
    hasWantedLevels,
    sections,
    categories,
    itemsIn,
    notWanted,
    isGrouped,
    holdPlace,
  };
}
