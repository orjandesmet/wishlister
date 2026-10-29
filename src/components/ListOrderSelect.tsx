import { For } from "solid-js";
import { t } from "../lib/i18n.ts";
import { listOrders, type ListOrder } from "../lib/listOrder.ts";
import u from "../utilities.module.css";
import { Select } from "./Select.tsx";
import styles from "./ListOrderSelect.module.css";

export type ListOrderSelectProps = {
  value: ListOrder;
  /** Offers "Not bought yet first". Never on your own list, where purchases stay secret. */
  showBought: boolean;
  /** Offers "Most wanted first": only when something is wanted more than the rest. */
  showWanted: boolean;
  onChange: (order: ListOrder) => void;
};

/** Picks how a wish list is sorted or grouped. */
export function ListOrderSelect(props: ListOrderSelectProps) {
  const options = () =>
    listOrders.filter(
      (o) => (o !== "available" || props.showBought) && (o !== "wanted" || props.showWanted),
    );
  return (
    <label class={styles.listOrder}>
      <span class={u.labelText}>{t("listOrder.label")}</span>
      {/* Lucide "arrow-up-down" (ISC licence): stands in for the label on small screens. */}
      <svg
        class={u.labelIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m21 16-4 4-4-4" />
        <path d="M17 20V4" />
        <path d="m3 8 4-4 4 4" />
        <path d="M7 4v16" />
      </svg>
      <Select
        class={styles.select}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as ListOrder)}
      >
        <For each={options()}>
          {(order) => (
            // Per-option selected: a select's value isn't re-applied when its options change.
            <option value={order} selected={order === props.value}>
              {t(`listOrder.${order}`)}
            </option>
          )}
        </For>
      </Select>
    </label>
  );
}
