import { A } from "@solidjs/router";
import { Match, Show, Switch } from "solid-js";
import type { Item } from "../lib/api/items.ts";
import { formatList, t } from "../lib/i18n.ts";

/**
 * Whether you can mark the item as bought. "hidden" shows nothing: your own list,
 * or purchases are still loading.
 */
export type PurchaseState = "hidden" | "available" | "mine" | "someone";

export type ItemCardProps = {
  item: Item;
  purchase: PurchaseState;
  /** Your own list, or a child's list you manage: shows Edit and Remove. */
  canEdit: boolean;
  /** Names of the groups the item is limited to, shown to editors. */
  groupNames: string[];
  onBuy: () => void;
  onUndo: () => void;
  onRemove: () => void;
};

/** One wish on a list. Only shows things; the page decides what the buttons do. */
export function ItemCard(props: ItemCardProps) {
  return (
    <li class="card item">
      <div class="row">
        <strong class="item-name">{props.item.name}</strong>
        <Show when={props.item.category}>
          <span class="chip">{props.item.category}</span>
        </Show>
      </div>
      <Show when={props.item.url}>
        {(url) => (
          <a class="link truncate" href={url()} target="_blank" rel="noopener noreferrer">
            {url()}
          </a>
        )}
      </Show>
      <Show when={props.canEdit && !props.item.visible_in_all_groups}>
        <p class="muted small">
          {t("item.onlyVisibleIn", {
            groups: props.groupNames.length > 0 ? formatList(props.groupNames) : t("item.noGroups"),
          })}
        </p>
      </Show>
      <Switch>
        <Match when={props.purchase === "mine"}>
          <div class="row">
            <span class="bought">{t("item.youBought")}</span>
            <button type="button" class="secondary small" onClick={() => props.onUndo()}>
              {t("item.undo")}
            </button>
          </div>
        </Match>
        <Match when={props.purchase === "someone"}>
          <span class="bought">{t("item.someoneBought")}</span>
        </Match>
        <Match when={props.purchase === "available"}>
          <button type="button" onClick={() => props.onBuy()}>
            {t("item.iBought")}
          </button>
        </Match>
      </Switch>
      <Show when={props.canEdit}>
        <div class="row">
          <A class="link" href={`/items/${props.item.id}/edit`}>
            {t("common.edit")}
          </A>
          <button type="button" class="link danger" onClick={() => props.onRemove()}>
            {t("common.remove")}
          </button>
        </div>
      </Show>
    </li>
  );
}
