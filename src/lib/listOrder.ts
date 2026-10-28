/**
 * How a wish list is laid out: in the order items were added, newest first, by
 * name, by price (cheapest or most expensive first), grouped under a heading per
 * category, or (on someone else's list) with the items nobody bought yet first.
 */
export type ListOrder =
  | "added"
  | "newest"
  | "name"
  | "priceAsc"
  | "priceDesc"
  | "category"
  | "available";

export const listOrders: ListOrder[] = [
  "added",
  "newest",
  "name",
  "priceAsc",
  "priceDesc",
  "category",
  "available",
];

/** One heading on the list. `category` is null for the single untitled section. */
export type ListSection<T> = { category: string | null; items: T[] };

export type ArrangeOptions = {
  /** How names and categories sort in the active language (compareNames). */
  compare: (a: string, b: string) => number;
  /**
   * Whether someone bought the item. Left out on your own list, where you must not
   * know, so "available" falls back to the order items were added.
   */
  isBought?: (index: number) => boolean;
  /**
   * The item's price in one common currency, or null when it has none or it can't
   * be converted. Left out, the price orders fall back to the order items were added.
   */
  priceOf?: (index: number) => number | null;
};

/**
 * Puts a list's items (given in the order they were added) in the chosen order.
 * Every order gives one untitled section, except "category": one section per
 * category, A to Z, with uncategorised items in a last untitled section. Spellings
 * that only differ in case ("books", "Books") share a section under the most used one.
 * Within a category, items stay in the order they were added.
 */
export function arrangeItems<T extends { name: string; category: string | null }>(
  items: T[],
  order: ListOrder,
  options: ArrangeOptions,
): ListSection<T>[] {
  const indexed = items.map((item, index) => ({ item, index }));
  const unwrap = (list: typeof indexed) => list.map(({ item }) => item);

  switch (order) {
    case "newest":
      return [{ category: null, items: unwrap(indexed.toReversed()) }];
    case "name":
      return [
        {
          category: null,
          items: unwrap(indexed.toSorted((a, b) => options.compare(a.item.name, b.item.name))),
        },
      ];
    case "available": {
      const isBought = options.isBought;
      if (!isBought) break;
      // A stable sort, so each half keeps the order items were added.
      const sorted = indexed.toSorted((a, b) => +isBought(a.index) - +isBought(b.index));
      return [{ category: null, items: unwrap(sorted) }];
    }
    case "priceAsc":
    case "priceDesc": {
      const priceOf = options.priceOf;
      if (!priceOf) break;
      const direction = order === "priceAsc" ? 1 : -1;
      // Items without a price go last either way; a stable sort keeps ties in the order added.
      const sorted = indexed
        .map((entry) => ({ ...entry, price: priceOf(entry.index) }))
        .toSorted((a, b) => {
          if (a.price === null || b.price === null)
            return +(a.price === null) - +(b.price === null);
          return (a.price - b.price) * direction;
        });
      return [{ category: null, items: unwrap(sorted) }];
    }
    case "category":
      return groupByCategory(items, options.compare);
  }
  return [{ category: null, items }];
}

function groupByCategory<T extends { category: string | null }>(
  items: T[],
  compare: (a: string, b: string) => number,
): ListSection<T>[] {
  const byKey = new Map<string, { items: T[]; spellings: Map<string, number> }>();
  const uncategorised: T[] = [];
  for (const item of items) {
    const value = item.category?.trim();
    if (!value) {
      uncategorised.push(item);
      continue;
    }
    const key = value.toLocaleLowerCase();
    const entry = byKey.get(key) ?? { items: [] as T[], spellings: new Map<string, number>() };
    entry.items.push(item);
    entry.spellings.set(value, (entry.spellings.get(value) ?? 0) + 1);
    byKey.set(key, entry);
  }

  const sections: ListSection<T>[] = [...byKey.values()]
    .map(({ items, spellings }) => ({
      category: [...spellings].sort((a, b) => b[1] - a[1])[0][0],
      items,
    }))
    .sort((a, b) => compare(a.category, b.category));
  if (uncategorised.length > 0) sections.push({ category: null, items: uncategorised });
  return sections;
}

const storageKey = "listOrder";

/** The order picked last on this device, or "added". */
export function readListOrder(): ListOrder {
  try {
    const saved = localStorage.getItem(storageKey);
    if (listOrders.includes(saved as ListOrder)) return saved as ListOrder;
  } catch {
    // Storage can be blocked (private mode); fall back to the default.
  }
  return "added";
}

/** Remembers the order on this device, for every list. */
export function saveListOrder(order: ListOrder) {
  try {
    localStorage.setItem(storageKey, order);
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}
