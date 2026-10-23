import { EditLabel } from "./EditLabel.tsx";
import { A } from "@solidjs/router";
import { RemoveLabel } from "./RemoveLabel.tsx";
import { For, Match, Show, Switch } from "solid-js";
import type { Item } from "../lib/api/items.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { convertAmount, displayCurrency, exchangeRates, formatPrice } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import type { OccasionId } from "../lib/ids.ts";
import { hueFor } from "../lib/hues.ts";
import { rememberBuyTap } from "../lib/moneyBurst.ts";
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

/**
 * The item's price as the shop showed it, and roughly what that is in your
 * currency when it's another one.
 */
function PriceTag(props: { amount: number; currency: string }) {
  const converted = () => {
    if (props.currency === displayCurrency()) return null;
    const amount = convertAmount(props.amount, props.currency, displayCurrency(), exchangeRates());
    return amount === null ? null : formatPrice(amount, displayCurrency(), locale());
  };
  return (
    <p class="price">
      <span class="price-amount">{formatPrice(props.amount, props.currency, locale())}</span>
      <Show when={converted()}>
        {(price) => (
          <span class="price-converted">{t("item.convertedPrice", { price: price() })}</span>
        )}
      </Show>
    </p>
  );
}

/** A list of names in the language's own wording ("A, B and C"), the names themselves in bold. */
function BoldList(props: { items: string[] }) {
  const parts = () =>
    new Intl.ListFormat(locale(), { type: "conjunction" }).formatToParts(props.items);
  return (
    <For each={parts()}>
      {(part) => (part.type === "element" ? <strong>{part.value}</strong> : part.value)}
    </For>
  );
}

/** The shop's name instead of the whole address, which only crowds the card. */
function shopName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * One wish, or "please don't buy" entry, on a list. Only shows things; the page
 * decides what the buttons do.
 */
export function ItemCard(props: ItemCardProps) {
  // Limited to groups, but none picked: nobody but the list's editors sees it.
  const isPrivate = () => !props.item.visible_in_all_groups && props.groupNames.length === 0;
  // The page starts the 💸 once the purchase is saved; remember where the tap was.
  // A "please don't buy" entry describes something; it has no shop or price to show.
  const showUrl = () => !props.selecting && !props.item.not_wanted && props.item.url;
  const rememberButton = (event: MouseEvent) =>
    rememberBuyTap(props.item.id, event.currentTarget as Element);
  return (
    <li
      class="card item"
      classList={{
        private: isPrivate(),
        "not-wanted": props.item.not_wanted,
        selected: props.selected,
      }}
    >
      <Show when={props.item.not_wanted}>
        <p class="item-warning not-wanted-note">
          {/* Lucide "ban" (ISC licence). */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
          </svg>
          {t("item.notWanted")}
        </p>
      </Show>
      <div class="item-head">
        <Show
          when={props.selecting}
          fallback={<strong class="item-name">{props.item.name}</strong>}
        >
          {/* The whole row is the label, so tapping anywhere on it ticks the box. */}
          <label class="check select-row">
            <input
              type="checkbox"
              checked={props.selected ?? false}
              onChange={() => props.onToggleSelect?.()}
            />
            <strong class="item-name">{props.item.name}</strong>
          </label>
        </Show>
        <Show when={props.canEdit && !props.selecting}>
          <div class="item-manage">
            <A class="link" href={`/items/${props.item.id}/edit`}>
              <EditLabel label={t("common.edit")} />
            </A>
            <button type="button" class="link danger" onClick={() => props.onRemove()}>
              <RemoveLabel />
            </button>
          </div>
        </Show>
      </div>
      <Show when={!props.item.not_wanted && props.item.price !== null && props.item.price_currency}>
        {(currency) => <PriceTag amount={props.item.price!} currency={currency()} />}
      </Show>
      <Show when={props.item.category || showUrl()}>
        <div class="item-meta">
          <Show when={props.item.category}>
            <span class="chip tinted" style={{ "--h": hueFor(props.item.category!) }}>
              {props.item.category}
            </span>
          </Show>
          <Show when={showUrl()}>
            {(url) => (
              <a class="link item-link" href={url()} target="_blank" rel="noopener noreferrer">
                <span class="truncate">{shopName(url())}</span>
                {/* Lucide "external-link" (ISC licence). */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
              </a>
            )}
          </Show>
        </div>
      </Show>
      <Show when={props.canEdit && !props.item.visible_in_all_groups && !isPrivate()}>
        <p class="muted small">
          {t("item.onlyVisibleIn", { groups: <BoldList items={props.groupNames} /> })}
        </p>
      </Show>
      <Show when={props.canEdit && isPrivate()}>
        <p class="item-warning small">
          {/* Lucide "triangle-alert" (ISC licence). */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          {t("item.private")}
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
            <button type="button" class="secondary small" onClick={() => props.onUndo()}>
              {t("item.undo")}
            </button>
          </div>
        </Match>
        <Match when={props.purchase === "someone"}>
          <span class="bought someone">{t("item.someoneBought")}</span>
        </Match>
        <Match when={props.purchase === "available" && props.occasionChoices}>
          {(choices) => (
            <div class="stack small-gap buy-for">
              <span class="field-label">{t("item.forWhichOccasion")}</span>
              <For each={choices()}>
                {(occasion) => (
                  <button
                    type="button"
                    class="secondary"
                    onClick={(event) => {
                      rememberButton(event);
                      props.onPickOccasion?.(occasion.id);
                    }}
                  >
                    {occasion.name} · {formatOccasionDate(occasion.date, locale())}
                  </button>
                )}
              </For>
              <div class="row">
                <button
                  type="button"
                  class="link"
                  onClick={(event) => {
                    rememberButton(event);
                    props.onPickOccasion?.(null);
                  }}
                >
                  {t("item.noOccasion")}
                </button>
                <button type="button" class="link" onClick={() => props.onCancelPick?.()}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          )}
        </Match>
        <Match when={props.purchase === "available"}>
          <button
            type="button"
            onClick={(event) => {
              rememberButton(event);
              props.onBuy();
            }}
          >
            {t("item.iBought")}
          </button>
        </Match>
      </Switch>
    </li>
  );
}
