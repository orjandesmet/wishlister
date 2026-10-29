import { EditLabel } from "./EditLabel.tsx";
import { A } from "@solidjs/router";
import { Dynamic } from "solid-js/web";
import { RemoveLabel } from "./RemoveLabel.tsx";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Match,
  on,
  Show,
  Switch,
  type JSX,
} from "solid-js";
import type { Item } from "../lib/api/items.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { convertAmount, displayCurrency, exchangeRates, formatPrice } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import type { OccasionId } from "../lib/ids.ts";
import { hueFor } from "../lib/hues.ts";
import { isShort, parseMarkdown, plainText } from "../lib/markdown.ts";
import { rememberBuyTap } from "../lib/moneyBurst.ts";
import { formatOccasionDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { Chip } from "./Chip.tsx";
import { ItemPicture } from "./ItemPicture.tsx";
import { itemPictureSources } from "../lib/itemPictures.ts";
import { Markdown } from "./Markdown.tsx";
import { WantedLevelText } from "./WantedLevelText.tsx";
import styles from "./ItemCard.module.css";

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
  /** The list's editors tap the hearts to say how much they want it (the next level, round). */
  onChangeWant?: () => void;
  /** Picking items for a bulk action: the card becomes a checkbox and hides its buttons. */
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** The item's questions button and dialog (ItemQuestions), left out while picking items. */
  questions?: JSX.Element;
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
    <p class={styles.price}>
      <span class={styles.priceAmount}>{formatPrice(props.amount, props.currency, locale())}</span>
      <Show when={converted()}>
        {(price) => (
          <span class={styles.priceConverted}>{t("item.convertedPrice", { price: price() })}</span>
        )}
      </Show>
    </p>
  );
}

/** Lucide "heart" (ISC licence), filled. */
function Heart() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

/**
 * How much the owner wants it: one heart for "I really want this", three for
 * "I really, really, REALLY want this", and nothing for plain "I want this", except
 * for the list's editors, who can tap it to change the level.
 */
function WantedLevel(props: { level: number; name: string; onChange?: () => void }) {
  const hearts = () => (props.level >= 3 ? 3 : props.level === 2 ? 1 : 0);
  const content = () => (
    <>
      <span class={styles.hearts} classList={{ [styles.noHearts]: hearts() === 0 }}>
        <For each={Array.from({ length: Math.max(hearts(), 1) })}>{() => <Heart />}</For>
      </span>
      <span>
        <WantedLevelText level={props.level as 1 | 2 | 3} />
      </span>
    </>
  );
  return (
    <Show
      when={props.onChange}
      fallback={
        <Show when={hearts() > 0}>
          <p class={`${styles.want} ${u.small}`}>{content()}</p>
        </Show>
      }
    >
      {(onChange) => (
        <Button
          variant="secondary"
          size="small"
          class={`${styles.want} ${styles.wantButton} ${u.small}`}
          onClick={() => onChange()()}
        >
          {content()}
          <span class={u.visuallyHidden}>. {t("item.changeWant", { name: props.name })}</span>
          {/* Lucide "chevrons-up-down" (ISC licence): says the level can be changed. */}
          <svg
            class={styles.wantChange}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </svg>
        </Button>
      )}
    </Show>
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

  // "I bought this", Undo and the occasion buttons replace each other once the page has saved,
  // so the pressed button is gone. Focus then moves to whatever replaced it (or the card),
  // instead of dropping to the top of the page. Only when focus was really lost, so it never
  // pulls focus away from somewhere else.
  // oxlint-disable-next-line no-unassigned-vars
  let card: HTMLElement | undefined;
  let refocus = false;
  const pressed = () => (refocus = true);
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

  // A long description starts as one or two lines of plain text, so the list stays easy
  // to scan; "Show more" opens the real thing, links and lists included.
  const description = createMemo(() => parseMarkdown(props.item.description ?? ""));
  const foldable = () => !isShort(description());
  const [expanded, setExpanded] = createSignal(false);
  const descriptionId = createUniqueId();
  const nameId = createUniqueId();

  return (
    <Card
      ref={card}
      as="li"
      tabIndex={-1}
      class={styles.item}
      classList={{
        [styles.private]: isPrivate(),
        [styles.notWanted]: props.item.not_wanted,
        [styles.selected]: props.selected,
      }}
    >
      {/* While picking, the whole card is the checkbox's label, and the box sits in its own
          column on the left: the same spot on every card, picture or not. */}
      <Dynamic component={props.selecting ? "label" : "div"} class={styles.body}>
        <Show when={props.selecting}>
          <input
            type="checkbox"
            class={styles.selectBox}
            aria-labelledby={nameId}
            checked={props.selected ?? false}
            onChange={() => props.onToggleSelect?.()}
          />
        </Show>
        <div class={styles.content}>
          <Show when={props.item.not_wanted}>
            <p class={`${styles.warning} ${styles.notWantedNote}`}>
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
          <div class={styles.top}>
            <div class={styles.topText}>
              <div class={styles.head}>
                <strong id={nameId} class={styles.name}>
                  {props.item.name}
                </strong>
                <Show when={props.canEdit && !props.selecting}>
                  <div class={styles.manage}>
                    <A class={u.link} href={`/items/${props.item.id}/edit`}>
                      <EditLabel label={t("common.edit")} of={props.item.name} />
                    </A>
                    <Button variant="link" danger onClick={() => props.onRemove()}>
                      <RemoveLabel of={props.item.name} />
                    </Button>
                  </div>
                </Show>
              </div>
              <Show
                when={
                  !props.item.not_wanted && props.item.price !== null && props.item.price_currency
                }
              >
                {(currency) => <PriceTag amount={props.item.price!} currency={currency()} />}
              </Show>
              <Show when={!props.item.not_wanted && !props.selecting}>
                <WantedLevel
                  level={props.item.wanted_level}
                  name={props.item.name}
                  onChange={props.canEdit ? props.onChangeWant : undefined}
                />
              </Show>
            </div>
            <div class={styles.picture}>
              <ItemPicture
                srcs={itemPictureSources(props.item)}
                name={props.item.name}
                zoomable={!props.selecting}
              />
            </div>
          </div>
          <Show when={description().length > 0}>
            <div class={styles.description}>
              <Show
                when={!foldable() || (expanded() && !props.selecting)}
                fallback={
                  <p id={descriptionId} class={styles.excerpt}>
                    {plainText(description())}
                  </p>
                }
              >
                <Markdown id={descriptionId} blocks={description()} />
              </Show>
              <Show when={foldable() && !props.selecting}>
                <Button
                  variant="link"
                  class={styles.more}
                  aria-expanded={expanded()}
                  aria-controls={descriptionId}
                  onClick={() => setExpanded((open) => !open)}
                >
                  {expanded() ? t("item.showLess") : t("item.showMore")}
                  <span class={u.visuallyHidden}>: {props.item.name}</span>
                </Button>
              </Show>
            </div>
          </Show>
          <Show when={props.item.category || showUrl()}>
            <div class={styles.meta}>
              <Show when={props.item.category}>
                <Chip hue={hueFor(props.item.category!)}>{props.item.category}</Chip>
              </Show>
              <Show when={showUrl()}>
                {(url) => (
                  <a
                    class={`${u.link} ${styles.shopLink}`}
                    href={url()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span class={u.truncate}>{shopName(url())}</span>
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
            <p class={`${u.muted} ${u.small}`}>
              {t("item.onlyVisibleIn", { groups: <BoldList items={props.groupNames} /> })}
            </p>
          </Show>
          <Show when={props.canEdit && isPrivate()}>
            <p class={`${styles.warning} ${u.small}`}>
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
          {/* Only others see a removed item: it stays because someone bought it. */}
          <Show when={props.item.removed_at && !props.selecting}>
            <p class={`${styles.warning} ${u.small}`}>
              {/* Lucide "circle-alert" (ISC licence). */}
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
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {props.purchase === "mine" ? t("item.removedMine") : t("item.removed")}
            </p>
          </Show>
          <Show when={!props.selecting && props.questions}>{props.questions}</Show>
          <Switch>
            <Match when={props.selecting}>{null}</Match>
            <Match when={props.purchase === "mine"}>
              <div class={u.row}>
                <span class={styles.bought}>
                  {props.boughtFor
                    ? t("item.youBoughtFor", { occasion: props.boughtFor })
                    : t("item.youBought")}
                </span>
                <Button
                  variant="secondary"
                  size="small"
                  data-purchase
                  onClick={() => {
                    pressed();
                    props.onUndo();
                  }}
                >
                  {t("item.undo")}
                  <span class={u.visuallyHidden}>: {props.item.name}</span>
                </Button>
              </div>
            </Match>
            <Match when={props.purchase === "someone"}>
              <span class={`${styles.bought} ${styles.someone}`}>{t("item.someoneBought")}</span>
            </Match>
            <Match when={props.purchase === "available" && props.occasionChoices}>
              {(choices) => (
                <div
                  class={`${u.stack} ${u.smallGap}`}
                  role="group"
                  aria-labelledby={occasionLabel}
                >
                  <span class={u.fieldLabel} id={occasionLabel}>
                    {t("item.forWhichOccasion")}
                  </span>
                  <For each={choices()}>
                    {(occasion) => (
                      <Button
                        variant="secondary"
                        data-purchase
                        onClick={(event) => {
                          pressed();
                          rememberButton(event);
                          props.onPickOccasion?.(occasion.id);
                        }}
                      >
                        {occasion.name} · {formatOccasionDate(occasion.date, locale())}
                      </Button>
                    )}
                  </For>
                  <div class={u.row}>
                    <Button
                      variant="link"
                      onClick={(event) => {
                        pressed();
                        rememberButton(event);
                        props.onPickOccasion?.(null);
                      }}
                    >
                      {t("item.noOccasion")}
                    </Button>
                    <Button
                      variant="link"
                      onClick={() => {
                        pressed();
                        props.onCancelPick?.();
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </Match>
            <Match when={props.purchase === "available"}>
              <button
                type="button"
                data-purchase
                onClick={(event) => {
                  pressed();
                  rememberButton(event);
                  props.onBuy();
                }}
              >
                {t("item.iBought")}
                <span class={u.visuallyHidden}>: {props.item.name}</span>
              </button>
            </Match>
          </Switch>
        </div>
      </Dynamic>
    </Card>
  );
}

/** An item typed in quick add that isn't saved yet: its name and how saving goes. */
export function PendingItemCard(props: { name: string; status: string }) {
  return (
    <Card as="li" class={`${styles.item} ${styles.pending}`}>
      <strong class={styles.name}>{props.name}</strong>
      <span class={`${u.muted} ${u.small}`}>{props.status}</span>
    </Card>
  );
}
