import { For } from "solid-js";
import { t } from "../lib/i18n.ts";
import { listOrders, type ListOrder } from "../lib/listOrder.ts";

export type ListOrderSelectProps = {
  value: ListOrder;
  /** Offers "Not bought yet first". Never on your own list, where purchases stay secret. */
  showBought: boolean;
  onChange: (order: ListOrder) => void;
};

/** Picks how a wish list is sorted or grouped. */
export function ListOrderSelect(props: ListOrderSelectProps) {
  const options = () => listOrders.filter((o) => o !== "available" || props.showBought);
  return (
    <label class="list-order">
      {t("listOrder.label")}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as ListOrder)}
      >
        <For each={options()}>
          {(order) => <option value={order}>{t(`listOrder.${order}`)}</option>}
        </For>
      </select>
    </label>
  );
}
