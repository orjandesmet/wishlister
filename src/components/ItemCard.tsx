import { A } from "@solidjs/router";
import { createEffect, createUniqueId, For, Match, on, Show, Switch } from "solid-js";
import { named } from "../lib/a11y.ts";
import type { Item } from "../lib/api/items.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { formatList, locale, t } from "../lib/i18n.ts";
import type { OccasionId } from "../lib/ids.ts";
import { formatOccasionDate } from "../lib/occasions.ts";

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
  /** The occasion you bought it for, shown with "You bought this". */
  boughtFor?: string;
  onBuy: () => void;
  /**
   * Set after "I bought this" when there are several occasions to buy it for: the
   * card asks which one, instead of showing the button.
   */
  occasionChoices?: Occasion[];
  /** null: not for an occasion. */
  onPickOccasion?: (occasionId: OccasionId | null) => void;
  onCancelPick?: () => void;
  onUndo: () => void;
  onRemove: () => void;
  /** Picking items for a bulk action: the card becomes a checkbox and hides its buttons. */
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

/** One wish on a list. Only shows things; the page decides what the buttons do. */
export function ItemCard(props: ItemCardProps) {
  // Limited to groups, but none picked: nobody but the list's editors sees it.
  const isPrivate = () => !props.item.visible_in_all_groups && props.groupNames.length === 0;

  // "I bought this", Undo and the occasion buttons replace each other once the page
  // has saved, so the pressed button is gone. Focus then moves to whatever replaced
  // it (or the card), instead of dropping to the top of the page.
  let card: HTMLLIElement | undefined;
  let refocus = false;
  const pressed = (action: () => void) => () => {
    refocus = true;
    action();
  };
  createEffect(
    on(
      () => [props.purchase, props.occasionChoices],
      () => {
        const lost = !document.activeElement || document.activeElement === document.body;
        if (!refocus || !lost || !card) return;
        refocus = false;
        (card.querySelector<HTMLElement>("[data-purchase]") ?? card).focus();
      },
      { defer: true },
    ),
  );
  const occasionLabel = createUniqueId();

  return (
    <li
      ref={(el) => (card = el)}
      class="card item"
      classList={{ private: isPrivate(), selected: props.selected }}
      tabIndex={-1}
    >
      <Show when={props.canEdit && isPrivate()}>
        <span class="badge-private">{t("item.private")}</span>
      </Show>
      <Show
        when={props.selecting}
        fallback={
          <div class="row">
            <strong class="item-name">{props.item.name}</strong>
            <Show when={props.item.category}>
              <span class="chip">{props.item.category}</span>
            </Show>
          </div>
        }
      >
        {/* The whole row is the label, so tapping anywhere on it ticks the box. */}
        <label class="check select-row">
          <input
            type="checkbox"
            checked={props.selected ?? false}
            onChange={() => props.onToggleSelect?.()}
          />
          <strong class="item-name">{props.item.name}</strong>
          <Show when={props.item.category}>
            <span class="chip">{props.item.category}</span>
          </Show>
        </label>
      </Show>
      <Show when={!props.selecting && props.item.url}>
        {(url) => (
          <a class="link truncate" href={url()} target="_blank" rel="noopener noreferrer">
            {url()}
          </a>
        )}
      </Show>
      <Show when={props.canEdit && !props.item.visible_in_all_groups && !isPrivate()}>
        <p class="muted small">
          {t("item.onlyVisibleIn", { groups: formatList(props.groupNames) })}
        </p>
      </Show>
      <Switch>
        <Match when={props.selecting}>{null}</Match>
        <Match when={props.purchase === "mine"}>
          <div class="row">
            <span class="bought">
              {props.boughtFor
                ? t("item.youBoughtFor", { occasion: props.boughtFor })
                : t("item.youBought")}
            </span>
            <button
              type="button"
              class="secondary small"
              data-purchase
              aria-label={named(t("item.undo"), props.item.name)}
              onClick={pressed(() => props.onUndo())}
            >
              {t("item.undo")}
            </button>
          </div>
        </Match>
        <Match when={props.purchase === "someone"}>
          <span class="bought">{t("item.someoneBought")}</span>
        </Match>
        <Match when={props.purchase === "available" && props.occasionChoices}>
          {(choices) => (
            <div class="stack small-gap buy-for" role="group" aria-labelledby={occasionLabel}>
              <span class="field-label" id={occasionLabel}>
                {t("item.forWhichOccasion")}
              </span>
              <For each={choices()}>
                {(occasion) => (
                  <button
                    type="button"
                    class="secondary"
                    data-purchase
                    onClick={pressed(() => props.onPickOccasion?.(occasion.id))}
                  >
                    {occasion.name} · {formatOccasionDate(occasion.date, locale())}
                  </button>
                )}
              </For>
              <div class="row">
                <button
                  type="button"
                  class="link"
                  onClick={pressed(() => props.onPickOccasion?.(null))}
                >
                  {t("item.noOccasion")}
                </button>
                <button type="button" class="link" onClick={pressed(() => props.onCancelPick?.())}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          )}
        </Match>
        <Match when={props.purchase === "available"}>
          <button
            type="button"
            data-purchase
            aria-label={named(t("item.iBought"), props.item.name)}
            onClick={pressed(() => props.onBuy())}
          >
            {t("item.iBought")}
          </button>
        </Match>
      </Switch>
      <Show when={props.canEdit && !props.selecting}>
        <div class="row">
          <A
            class="link"
            href={`/items/${props.item.id}/edit`}
            aria-label={named(t("common.edit"), props.item.name)}
          >
            {t("common.edit")}
          </A>
          <button
            type="button"
            class="link danger"
            aria-label={named(t("common.remove"), props.item.name)}
            onClick={() => props.onRemove()}
          >
            {t("common.remove")}
          </button>
        </div>
      </Show>
    </li>
  );
}
