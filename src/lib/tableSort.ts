/** The columns of the table view that sort when you click their header. */
export type TableColumn = "name" | "wanted" | "category" | "price" | "questions" | "status";

export const tableColumns: TableColumn[] = [
  "name",
  "wanted",
  "category",
  "price",
  "questions",
  "status",
];

export type SortDirection = "ascending" | "descending";

/** The table's order: a column and its direction, or null for the order items were added. */
export type TableSort = { column: TableColumn; direction: SortDirection } | null;

/**
 * Which way a column sorts on the first click: names and categories A to Z, prices low to
 * high, "not bought yet" first, and the most wanted and most asked about first.
 */
export const firstDirection: Record<TableColumn, SortDirection> = {
  name: "ascending",
  wanted: "descending",
  category: "ascending",
  price: "ascending",
  questions: "descending",
  status: "ascending",
};

/** Before you click any header: most wanted first, like the cards. */
export const defaultTableSort: TableSort = { column: "wanted", direction: "descending" };

/**
 * Clicking a header: sorts by that column, then the other way round, then back to the
 * order items were added.
 */
export function nextTableSort(current: TableSort, column: TableColumn): TableSort {
  if (current?.column !== column) return { column, direction: firstDirection[column] };
  if (current.direction === firstDirection[column]) {
    return { column, direction: current.direction === "ascending" ? "descending" : "ascending" };
  }
  return null;
}

export type TableSortOptions = {
  /** How names and categories sort in the active language (compareNames). */
  compare: (a: string, b: string) => number;
  /** How much the owner wants the item, 1 to 3. */
  wantOf: (index: number) => number;
  /** The price in one common currency, or null when it has none or can't be converted. */
  priceOf: (index: number) => number | null;
  /** How many questions the item has. */
  questionsOf: (index: number) => number;
  /** Whether someone bought it. Left out on your own list, where you must not know. */
  isBought?: (index: number) => boolean;
};

/**
 * Puts the table's rows (given in the order they were added) in the chosen order. A stable
 * sort, so ties keep the order added. Items without a price or category go last, whichever
 * way the column sorts. Without isBought, "status" keeps the order added.
 */
export function sortTableItems<T extends { name: string; category: string | null }>(
  items: T[],
  sort: TableSort,
  options: TableSortOptions,
): T[] {
  if (!sort) return items;
  const sign = sort.direction === "ascending" ? 1 : -1;
  const value = (item: T, index: number): string | number | null => {
    switch (sort.column) {
      case "name":
        return item.name;
      case "category":
        return item.category?.trim() || null;
      case "wanted":
        return options.wantOf(index);
      case "price":
        return options.priceOf(index);
      case "questions":
        return options.questionsOf(index);
      case "status":
        return options.isBought ? +options.isBought(index) : 0;
    }
  };
  return items
    .map((item, index) => ({ item, value: value(item, index) }))
    .toSorted((a, b) => {
      if (a.value === null || b.value === null) return +(a.value === null) - +(b.value === null);
      const diff =
        typeof a.value === "string"
          ? options.compare(a.value, b.value as string)
          : a.value - (b.value as number);
      return diff * sign;
    })
    .map(({ item }) => item);
}

const storageKey = "table-sort";

/** The table order picked last on this device, or the default when none was picked yet. */
export function readTableSort(): TableSort {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return defaultTableSort;
    if (saved === "added") return null;
    const [column, direction] = saved.split(":");
    if (
      tableColumns.includes(column as TableColumn) &&
      (direction === "ascending" || direction === "descending")
    ) {
      return { column: column as TableColumn, direction };
    }
  } catch {
    // Storage can be blocked (private mode); fall back to the default.
  }
  return defaultTableSort;
}

/** Remembers the table order on this device, for every list. */
export function saveTableSort(sort: TableSort) {
  try {
    localStorage.setItem(storageKey, sort ? `${sort.column}:${sort.direction}` : "added");
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}
