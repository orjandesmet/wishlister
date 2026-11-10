import { A } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Match,
  Show,
  Switch,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Item } from "../lib/api/items.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { createPurchaseRefocus } from "../lib/createPurchaseRefocus.ts";
import type { PurchaseState } from "../lib/createPurchases.ts";
import { hueFor } from "../lib/hues.ts";
import { locale, t } from "../lib/i18n.ts";
import type { OccasionId } from "../lib/ids.ts";
import { itemPictureSources } from "../lib/itemPictures.ts";
import { shopName } from "../lib/links.ts";
import { isShort, parseMarkdown, plainText } from "../lib/markdown.ts";
import { rememberBuyTap } from "../lib/moneyBurst.ts";
import { heartCount } from "../lib/wantedLevel.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { Chip } from "./Chip.tsx";
import { EditLabel } from "./EditLabel.tsx";
import { ExternalLinkIcon } from "./ExternalLinkIcon.tsx";
import { HeartIcon } from "./HeartIcon.tsx";
import { Icon } from "./Icon.tsx";
import styles from "./ItemCard.module.css";
import { ItemPicture } from "./ItemPicture.tsx";
import { Markdown } from "./Markdown.tsx";
import { OccasionPicker } from "./OccasionPicker.tsx";
import { PriceTag } from "./PriceTag.tsx";
import { PurchaseSteps } from "./PurchaseSteps.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import { WantedLevelText } from "./WantedLevelText.tsx";

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
  /**
   * Your own purchase's "Delivered" tick. Left out, the card has no tick: the pill and Undo
   * stay as they were (the setting "Show delivery status on item cards" switches it off).
   */
  delivered?: boolean;
  onDelivered?: (delivered: boolean) => void;
  onRemove: () => void;
  /** The list's editors tap the hearts to say how much they want it (the next level, round). */
  onChangeWant?: () => void;
  /** Picking items for a bulk action: the card becomes a checkbox and hides its buttons. */
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** The item's questions button and dialog (ItemQuestions), left out while picking items. */
  questions?: JSX.Element;
  /**
   * A smaller card: hearts beside the name, a picture icon and a link icon instead of the
   * picture and shop name, no category or description. Details shows the full card.
   */
  compact?: boolean;
  /** Finds the card on the page, e.g. to slide it to a new place (animateMoves). */
  "data-item-id"?: string;
};

/**
 * How much the owner wants it: one heart for "I really want this", three for
 * "I really, really, REALLY want this", and nothing for plain "I want this", except
 * for the list's editors, who can tap it to change the level.
 */
function WantedLevel(props: { level: number; name: string; onChange?: () => void }) {
  const hearts = () => heartCount(props.level);
  const content = () => (
    <>
      <span class={styles.hearts} classList={{ [styles.noHearts]: hearts() === 0 }}>
        <For each={Array.from({ length: Math.max(hearts(), 1) })}>{() => <HeartIcon />}</For>
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
          <Icon class={styles.wantChange}>
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </Icon>
        </Button>
      )}
    </Show>
  );
}

/**
 * The hearts alone, beside the name on a compact card. Screen readers hear the level's
 * words instead. Plain "I want this" has no hearts, so shows nothing.
 */
function InlineHearts(props: { level: number }) {
  const hearts = () => heartCount(props.level);
  return (
    <Show when={hearts() > 0}>
      <span class={`${styles.hearts} ${styles.inlineHearts}`}>
        <For each={Array.from({ length: hearts() })}>{() => <HeartIcon />}</For>
        <span class={u.visuallyHidden}>
          <WantedLevelText level={props.level as 1 | 2 | 3} />
        </span>
      </span>
    </Show>
  );
}

/** A list of names in the language's own wording ("A, B and C"), the names themselves in bold. */
export function BoldList(props: { items: string[] }) {
  const parts = () =>
    new Intl.ListFormat(locale(), { type: "conjunction" }).formatToParts(props.items);
  return (
    <For each={parts()}>
      {(part) => (part.type === "element" ? <strong>{part.value}</strong> : part.value)}
    </For>
  );
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

  // oxlint-disable-next-line no-unassigned-vars
  let card: HTMLElement | undefined;
  const pressed = createPurchaseRefocus(
    () => card,
    () => [props.purchase, props.occasionChoices],
  );

  // A long description starts as one or two lines of plain text, so the list stays easy
  // to scan; "Show more" opens the real thing, links and lists included.
  const description = createMemo(() => parseMarkdown(props.item.description ?? ""));
  const foldable = () => !isShort(description());
  const [expanded, setExpanded] = createSignal(false);
  const descriptionId = createUniqueId();
  const nameId = createUniqueId();

  // Details opens a compact card into the full one, and Less folds it again. The button moves
  // between the two layouts, so focus follows it. The card grows or shrinks to its new height
  // (no animation with reduced motion).
  const [details, setDetails] = createSignal(false);
  const compact = () => !!props.compact && !details();
  const contentId = createUniqueId();
  // oxlint-disable-next-line no-unassigned-vars
  let detailsButton: HTMLButtonElement | undefined;
  // What changes between the two layouts, measured before and after, so it can glide over.
  const measure = (el: HTMLElement) => {
    const name = document.getElementById(nameId);
    const content = document.getElementById(contentId);
    const style = getComputedStyle(el);
    // Longhands: not every browser gives the shorthands back from getComputedStyle.
    return {
      card: {
        height: `${el.offsetHeight}px`,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        borderTopLeftRadius: style.borderTopLeftRadius,
        borderTopRightRadius: style.borderTopRightRadius,
        borderBottomLeftRadius: style.borderBottomLeftRadius,
        borderBottomRightRadius: style.borderBottomRightRadius,
      },
      gap: content ? getComputedStyle(content).rowGap : undefined,
      fontSize: name ? getComputedStyle(name).fontSize : undefined,
    };
  };
  const toggleDetails = () => {
    const animate =
      card &&
      typeof card.animate === "function" &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const before = animate ? measure(card!) : undefined;
    setDetails((open) => !open);
    // No scrolling: inside the clipped, growing card that would show its bottom first.
    queueMicrotask(() => detailsButton?.focus({ preventScroll: true }));
    if (!before || !card) return;
    const after = measure(card);
    const timing = { duration: 250, easing: "cubic-bezier(0.2, 0, 0, 1)" };
    card.animate(
      [
        { ...before.card, overflow: "hidden" },
        { ...after.card, overflow: "hidden" },
      ],
      timing,
    );
    if (before.gap && after.gap) {
      document
        .getElementById(contentId)
        ?.animate([{ rowGap: before.gap }, { rowGap: after.gap }], timing);
    }
    if (before.fontSize && after.fontSize) {
      document
        .getElementById(nameId)
        ?.animate([{ fontSize: before.fontSize }, { fontSize: after.fontSize }], timing);
    }
  };

  const detailsToggle = () => (
    <Show when={props.compact && !props.selecting}>
      <Button
        ref={detailsButton}
        variant="link"
        size="small"
        class={styles.details}
        aria-expanded={details()}
        aria-controls={contentId}
        onClick={toggleDetails}
      >
        <span class={u.labelText}>{details() ? t("item.lessDetails") : t("item.details")}</span>
        {/* Lucide "chevrons-down-up" / "chevrons-up-down" (ISC licence): fold, or open. */}
        <Icon class={u.labelIcon}>
          <Show
            when={details()}
            fallback={
              <>
                <path d="m7 15 5 5 5-5" />
                <path d="m7 9 5-5 5 5" />
              </>
            }
          >
            <path d="m7 20 5-5 5 5" />
            <path d="m7 4 5 5 5-5" />
          </Show>
        </Icon>
        <span class={u.visuallyHidden}>: {props.item.name}</span>
      </Button>
    </Show>
  );

  return (
    <Card
      ref={card}
      as="li"
      data-item-id={props["data-item-id"]}
      tabIndex={-1}
      class={styles.item}
      classList={{
        [styles.private]: isPrivate(),
        [styles.notWanted]: props.item.not_wanted,
        [styles.selected]: props.selected,
        [styles.compact]: compact(),
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
        <div id={contentId} class={styles.content}>
          <Show when={props.item.not_wanted}>
            <p class={`${styles.warning} ${styles.notWantedNote}`}>
              {/* Lucide "ban" (ISC licence). */}
              <Icon>
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </Icon>
              {t("item.notWanted")}
            </p>
          </Show>
          <div class={styles.top}>
            <div class={styles.topText}>
              <div class={styles.head}>
                <strong id={nameId} class={styles.name}>
                  {props.item.name}
                  <Show when={compact() && !props.item.not_wanted}>
                    <InlineHearts level={props.item.wanted_level} />
                  </Show>
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
                  !compact() &&
                  !props.item.not_wanted &&
                  props.item.price !== null &&
                  props.item.price_currency
                }
              >
                {(currency) => <PriceTag amount={props.item.price!} currency={currency()} />}
              </Show>
              <Show when={!compact() && !props.item.not_wanted && !props.selecting}>
                <WantedLevel
                  level={props.item.wanted_level}
                  name={props.item.name}
                  onChange={props.canEdit ? props.onChangeWant : undefined}
                />
              </Show>
            </div>
            <Show when={!compact()}>
              <div class={styles.picture}>
                <ItemPicture
                  srcs={itemPictureSources(props.item)}
                  name={props.item.name}
                  zoomable={!props.selecting}
                />
              </div>
            </Show>
          </div>
          {/* Compact: the price, then the picture and shop as icons, and Details at the end. */}
          <Show when={compact()}>
            <div class={styles.compactRow}>
              <Show
                when={
                  !props.item.not_wanted && props.item.price !== null && props.item.price_currency
                }
              >
                {(currency) => <PriceTag amount={props.item.price!} currency={currency()} small />}
              </Show>
              <ItemPicture
                srcs={itemPictureSources(props.item)}
                name={props.item.name}
                zoomable={!props.selecting}
                icon
              />
              <Show when={showUrl()}>
                {(url) => (
                  <a
                    class={`${u.link} ${styles.shopLink} ${styles.shopIcon}`}
                    href={url()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon />
                    <span class={u.visuallyHidden}>
                      {t("item.openShop", { name: props.item.name })}
                    </span>
                  </a>
                )}
              </Show>
              {detailsToggle()}
            </div>
          </Show>
          <Show when={!compact() && description().length > 0}>
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
          <Show
            when={
              !compact() &&
              (props.item.category || showUrl() || (props.compact && !props.selecting))
            }
          >
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
                    <ExternalLinkIcon />
                  </a>
                )}
              </Show>
              {detailsToggle()}
            </div>
          </Show>
          <Show
            when={!compact() && props.canEdit && !props.item.visible_in_all_groups && !isPrivate()}
          >
            <p class={`${u.muted} ${u.small}`}>
              {t("item.onlyVisibleIn", { groups: <BoldList items={props.groupNames} /> })}
            </p>
          </Show>
          <Show when={props.canEdit && isPrivate()}>
            <p class={`${styles.warning} ${u.small}`}>
              {/* Lucide "triangle-alert" (ISC licence). */}
              <Icon>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </Icon>
              {t("item.private")}
            </p>
          </Show>
          {/* Only others see a removed item: it stays because someone bought it. */}
          <Show when={props.item.removed_at && !props.selecting}>
            <p class={`${styles.warning} ${u.small}`}>
              {/* Lucide "circle-alert" (ISC licence). */}
              <Icon>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </Icon>
              {props.purchase === "mine" ? t("item.removedMine") : t("item.removed")}
            </p>
          </Show>
          {/* Compact: questions and the purchase share one line. */}
          <div class={compact() ? styles.compactActions : styles.actions}>
            <Show when={!props.selecting && props.questions}>{props.questions}</Show>
            <Switch>
              <Match when={props.selecting}>{null}</Match>
              <Match when={props.purchase === "mine"}>
                <PurchaseSteps
                  name={props.item.name}
                  boughtFor={props.boughtFor}
                  compact={compact()}
                  delivered={props.delivered}
                  onDelivered={props.onDelivered}
                  onUndo={() => {
                    pressed();
                    props.onUndo();
                  }}
                />
              </Match>
              <Match when={props.purchase === "someone"}>
                <span class={`${styles.bought} ${styles.someone}`}>{t("item.someoneBought")}</span>
              </Match>
              <Match when={props.purchase === "available" && props.occasionChoices}>
                {(choices) => (
                  <OccasionPicker
                    choices={choices()}
                    onPick={(occasionId, event) => {
                      pressed();
                      rememberButton(event);
                      props.onPickOccasion?.(occasionId);
                    }}
                    onCancel={() => {
                      pressed();
                      props.onCancelPick?.();
                    }}
                  />
                )}
              </Match>
              <Match when={props.purchase === "available"}>
                <button
                  type="button"
                  class={compact() ? styles.compactBuy : undefined}
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
