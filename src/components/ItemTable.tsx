import { Icon } from "./Icon.tsx";
import { A } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Match,
  Show,
  Switch,
  type JSX,
} from "solid-js";
import type { Item } from "../lib/api/items.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import type { Question } from "../lib/api/questions.ts";
import { createPurchaseRefocus } from "../lib/createPurchaseRefocus.ts";
import { hueFor } from "../lib/hues.ts";
import { t } from "../lib/i18n.ts";
import type { ItemId, OccasionId } from "../lib/ids.ts";
import { itemPictureSources } from "../lib/itemPictures.ts";
import { shopName } from "../lib/links.ts";
import { parseMarkdown } from "../lib/markdown.ts";
import { rememberBuyTap } from "../lib/moneyBurst.ts";
import type { PurchaseState } from "../lib/createPurchases.ts";
import type { TableColumn, TableSort } from "../lib/tableSort.ts";
import { heartCount } from "../lib/wantedLevel.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Chip } from "./Chip.tsx";
import { EditLabel } from "./EditLabel.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import { ExternalLinkIcon } from "./ExternalLinkIcon.tsx";
import { HeartIcon } from "./HeartIcon.tsx";
import { ItemPicture } from "./ItemPicture.tsx";
import { OccasionPicker } from "./OccasionPicker.tsx";
import styles from "./ItemTable.module.css";
import { Markdown } from "./Markdown.tsx";
import { PriceTag } from "./PriceTag.tsx";
import { YouBoughtFor } from "./YouBoughtFor.tsx";
import { WantedLevelText } from "./WantedLevelText.tsx";

export type ItemTableProps = {
  /** The wishes, already in the table's order. "Please don't buy" entries stay out. */
  items: Item[];
  /** Your own list, or a child's list you manage: checkboxes, "Visible in" and Edit. */
  canEdit: boolean;
  sort: TableSort;
  onSort: (column: TableColumn) => void;
  /** Whether bought items can be told apart (never on your own list): the Bought column. */
  showBought: boolean;
  purchase: (item: Item) => PurchaseState;
  /** The occasion you bought it for. */
  boughtFor: (item: Item) => string | undefined;
  /** Names of the groups the item is limited to, shown to editors. */
  groupNames: (item: Item) => string[];
  /** Set after "I bought this" when there are several occasions to buy it for. */
  occasionChoices: (item: Item) => Occasion[] | undefined;
  onBuy: (item: Item) => void;
  /** null: not for an occasion. */
  onPickOccasion: (item: Item, occasionId: OccasionId | null) => void;
  onCancelPick: () => void;
  onUndo: (item: Item) => void;
  /** The list's editors tap the hearts to say how much they want it (the next level, round). */
  onChangeWant: (item: Item) => void;
  /** The list's editors remove an item (after confirming). */
  onRemove: (item: Item) => void;
  /** The item's questions button and dialog (ItemQuestions, short). */
  questions: (item: Item) => JSX.Element;
  /** The item's questions, shown in its detail row. */
  questionList: (item: Item) => Question[];
  selected: ReadonlySet<ItemId>;
  onToggleSelect: (item: Item) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  /**
   * The "Please don't buy" entries, below the wishes: no hearts, price, shop or buying, no
   * sorting (they stay in the order added) and no "select all".
   */
  notWanted?: boolean;
};

/** "–" in a cell with nothing to show; screen readers just hear an empty cell. */
function Empty() {
  return (
    <span class={u.muted} aria-hidden="true">
      –
    </span>
  );
}

/** A column header that sorts when clicked: the direction shows as an arrow, and in aria-sort. */
function SortHeader(props: {
  column: TableColumn;
  label: string;
  sort: TableSort;
  onSort: (column: TableColumn) => void;
  class?: string;
}) {
  const direction = () => (props.sort?.column === props.column ? props.sort.direction : undefined);
  return (
    <th scope="col" class={props.class} aria-sort={direction() ?? "none"}>
      <button type="button" class={styles.sort} onClick={() => props.onSort(props.column)}>
        {props.label}
        {/* Lucide "arrow-up" / "arrow-down" / "arrow-up-down" (ISC licence). */}
        <Icon class={styles.arrow} classList={{ [styles.idle]: !direction() }}>
          <Switch
            fallback={
              <>
                <path d="m21 16-4 4-4-4" />
                <path d="M17 20V4" />
                <path d="m3 8 4-4 4 4" />
                <path d="M7 4v16" />
              </>
            }
          >
            <Match when={direction() === "ascending"}>
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </Match>
            <Match when={direction() === "descending"}>
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
            </Match>
          </Switch>
        </Icon>
      </button>
    </th>
  );
}

/** How much the owner wants it, as hearts. Editors tap them for the next level, round. */
function WantedCell(props: { item: Item; onChange?: () => void }) {
  const level = () => props.item.wanted_level;
  const hearts = () => heartCount(level());
  const content = () => (
    <>
      <span class={styles.hearts} classList={{ [styles.noHearts]: hearts() === 0 }}>
        <For each={Array.from({ length: Math.max(hearts(), 1) })}>{() => <HeartIcon />}</For>
      </span>
      <span class={u.visuallyHidden}>
        <WantedLevelText level={level()} />
      </span>
    </>
  );
  return (
    <Show
      when={props.onChange}
      fallback={
        <Show when={hearts() > 0} fallback={<Empty />}>
          {content()}
        </Show>
      }
    >
      {(onChange) => (
        <button type="button" class={styles.wantButton} onClick={() => onChange()()}>
          {content()}
          <span class={u.visuallyHidden}>. {t("item.changeWant", { name: props.item.name })}</span>
        </button>
      )}
    </Show>
  );
}

/** One wish: a row, and on someone else's list a detail row under it that opens. */
function Row(props: { item: Item; table: ItemTableProps; columns: number }) {
  const item = () => props.item;
  const table = () => props.table;
  const purchase = () => table().purchase(item());
  const bought = () => purchase() === "mine" || purchase() === "someone";
  const groupNames = () => table().groupNames(item());
  // Limited to groups, but none picked: nobody but the list's editors sees it.
  const isPrivate = () => !item().visible_in_all_groups && groupNames().length === 0;
  const [open, setOpen] = createSignal(false);
  const detailId = createUniqueId();
  const description = createMemo(() => parseMarkdown(item().description ?? ""));
  const remember = (event: MouseEvent) => rememberBuyTap(item().id, event.currentTarget as Element);

  // As on the cards: once the purchase is saved, focus moves to what replaced the pressed button.
  // oxlint-disable-next-line no-unassigned-vars
  let row: HTMLTableSectionElement | undefined;
  const pressed = createPurchaseRefocus(
    () => row,
    () => [purchase(), table().occasionChoices(item())],
  );

  return (
    // A body per item, so the detail row moves along when the rows slide (animateMoves).
    <tbody
      ref={row}
      data-item-id={item().id}
      tabIndex={-1}
      class={styles.item}
      classList={{
        [styles.bought]: bought(),
        [styles.selected]: table().selected.has(item().id),
        [styles.open]: open(),
      }}
    >
      <tr>
        <td class={styles.lead}>
          <Show
            when={table().canEdit}
            fallback={
              <button
                type="button"
                class={styles.expand}
                aria-expanded={open()}
                aria-controls={detailId}
                onClick={() => setOpen((was) => !was)}
              >
                {/* Lucide "chevron-right" (ISC licence), turned down when open. */}
                <Icon>
                  <path d="m9 18 6-6-6-6" />
                </Icon>
                <span class={u.visuallyHidden}>{t("table.details", { name: item().name })}</span>
              </button>
            }
          >
            <input
              type="checkbox"
              class={styles.check}
              aria-label={t("table.select", { name: item().name })}
              checked={table().selected.has(item().id)}
              onChange={() => table().onToggleSelect(item())}
            />
          </Show>
        </td>
        <td class={styles.picture}>
          <ItemPicture srcs={itemPictureSources(item())} name={item().name} zoomable />
        </td>
        <th scope="row" class={styles.name}>
          <span class={styles.nameText}>{item().name}</span>
          {/* Only others see a removed item: it stays because someone bought it. */}
          <Show when={item().removed_at}>
            <span class={`${styles.note} ${u.small}`}>
              {purchase() === "mine" ? t("item.removedMine") : t("item.removed")}
            </span>
          </Show>
        </th>
        <Show when={!table().notWanted}>
          <td class={styles.wanted}>
            <WantedCell
              item={item()}
              onChange={table().canEdit ? () => table().onChangeWant(item()) : undefined}
            />
          </td>
        </Show>
        <td>
          <Show when={item().category} fallback={<Empty />}>
            {(category) => <Chip hue={hueFor(category())}>{category()}</Chip>}
          </Show>
        </td>
        <Show when={!table().notWanted}>
          <td class={styles.number}>
            <Show when={item().price !== null && item().price_currency} fallback={<Empty />}>
              {(currency) => <PriceTag amount={item().price!} currency={currency()} small />}
            </Show>
          </td>
          <td class={styles.shop}>
            <Show when={item().url} fallback={<Empty />}>
              {(url) => (
                <a class={u.link} href={url()} target="_blank" rel="noopener noreferrer">
                  <span class={`${u.truncate} ${styles.shopName}`}>{shopName(url())}</span>
                  <ExternalLinkIcon />
                  <span class={u.visuallyHidden}>: {item().name}</span>
                </a>
              )}
            </Show>
          </td>
        </Show>
        <Show when={table().canEdit}>
          <td>
            <Switch>
              <Match when={isPrivate()}>
                <span class={styles.onlyMe}>
                  {/* Lucide "lock" (ISC licence). */}
                  <Icon>
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </Icon>
                  {t("table.onlyMe")}
                </span>
              </Match>
              <Match when={item().visible_in_all_groups}>
                <span class={`${u.muted} ${u.small} ${u.noWrap}`}>{t("table.allGroups")}</span>
              </Match>
              <Match when={true}>
                <span class={styles.groups}>
                  <For each={groupNames()}>{(name) => <Chip>{name}</Chip>}</For>
                </span>
              </Match>
            </Switch>
          </td>
        </Show>
        <td class={styles.questions}>{table().questions(item())}</td>
        {/* Nobody buys a "please don't buy" entry: only its editors get a last column, for Edit. */}
        <Show when={!table().notWanted || table().canEdit}>
          <td class={styles.status}>
            <Show
              when={!table().canEdit}
              fallback={
                <span class={styles.statusRow}>
                  <A class={u.link} href={`/items/${item().id}/edit`}>
                    <EditLabel label={t("common.edit")} of={item().name} />
                  </A>
                  <Button variant="link" danger onClick={() => table().onRemove(item())}>
                    <RemoveLabel of={item().name} />
                  </Button>
                </span>
              }
            >
              <Switch>
                <Match when={purchase() === "mine"}>
                  <span class={styles.statusRow}>
                    <span class={styles.pill}>
                      <Show when={table().boughtFor(item())} fallback={t("item.youBought")}>
                        {(occasion) => <YouBoughtFor occasion={occasion()} />}
                      </Show>
                    </span>
                    <Button
                      variant="secondary"
                      size="small"
                      class={styles.statusButton}
                      data-purchase
                      onClick={() => {
                        pressed();
                        table().onUndo(item());
                      }}
                    >
                      {t("item.undo")}
                      <span class={u.visuallyHidden}>: {item().name}</span>
                    </Button>
                  </span>
                </Match>
                <Match when={purchase() === "someone"}>
                  <span class={`${styles.pill} ${styles.someone}`}>{t("item.someoneBought")}</span>
                </Match>
                <Match when={purchase() === "available" && table().occasionChoices(item())}>
                  {(choices) => (
                    <OccasionPicker
                      choices={choices()}
                      small
                      buttonClass={styles.statusButton}
                      rowClass={styles.statusRow}
                      onPick={(occasionId, event) => {
                        pressed();
                        remember(event);
                        table().onPickOccasion(item(), occasionId);
                      }}
                      onCancel={() => {
                        pressed();
                        table().onCancelPick();
                      }}
                    />
                  )}
                </Match>
                <Match when={purchase() === "available"}>
                  <Button
                    size="small"
                    class={styles.statusButton}
                    data-purchase
                    onClick={(event) => {
                      pressed();
                      remember(event);
                      table().onBuy(item());
                    }}
                  >
                    {t("item.iBought")}
                    <span class={u.visuallyHidden}>: {item().name}</span>
                  </Button>
                </Match>
              </Switch>
            </Show>
          </td>
        </Show>
      </tr>
      <Show when={open()}>
        <tr id={detailId} class={styles.detail}>
          <td colSpan={props.columns}>
            <div class={styles.detailGrid}>
              <div class={styles.detailPart}>
                <h3>{t("table.pictures")}</h3>
                <Show
                  when={itemPictureSources(item()).length > 0}
                  fallback={<p class={`${u.muted} ${u.small}`}>{t("table.noPictures")}</p>}
                >
                  <ItemPicture srcs={itemPictureSources(item())} name={item().name} zoomable />
                </Show>
              </div>
              <div class={styles.detailPart}>
                <h3>{t("table.description")}</h3>
                <Show
                  when={description().length > 0}
                  fallback={<p class={`${u.muted} ${u.small}`}>{t("table.noDescription")}</p>}
                >
                  <Markdown blocks={description()} />
                </Show>
              </div>
              <div class={styles.detailPart}>
                <h3>{t("table.questions")}</h3>
                <Show
                  when={table().questionList(item()).length > 0}
                  fallback={<p class={`${u.muted} ${u.small}`}>{t("questions.none")}</p>}
                >
                  <ol class={styles.qa}>
                    <For each={table().questionList(item())}>
                      {(question) => (
                        <li>
                          <p class={styles.question}>
                            <span class={u.visuallyHidden}>{t("questions.questionLabel")}: </span>
                            {question.question}
                          </p>
                          <Show
                            when={question.answer}
                            fallback={
                              <p class={`${u.muted} ${u.small}`}>{t("questions.notAnswered")}</p>
                            }
                          >
                            {(answer) => (
                              <p class={u.small}>
                                <span class={u.muted}>
                                  {question.answerer_name
                                    ? t("questions.answerFrom", { name: question.answerer_name })
                                    : t("questions.answerLabel")}
                                  :{" "}
                                </span>
                                {answer()}
                              </p>
                            )}
                          </Show>
                        </li>
                      )}
                    </For>
                  </ol>
                </Show>
              </div>
            </div>
          </td>
        </tr>
      </Show>
    </tbody>
  );
}

/**
 * A list's wishes as a table, on wide screens (#136): picture, name, hearts, category,
 * price, shop, questions, and the purchase (or, for the list's editors, where it's visible
 * and Edit). Column headers sort it. Editors tick rows for bulk actions; others open a
 * row for its pictures, description and questions. Only shows things; the page decides
 * what the buttons do.
 */
export function ItemTable(props: ItemTableProps) {
  const columns = () => {
    if (props.notWanted) return props.canEdit ? 7 : 5;
    return props.canEdit ? 10 : 9;
  };
  const selectedCount = () => props.items.filter((item) => props.selected.has(item.id)).length;
  const allSelected = () => props.items.length > 0 && selectedCount() === props.items.length;
  // oxlint-disable-next-line no-unassigned-vars
  let selectAll: HTMLInputElement | undefined;
  createEffect(() => {
    if (selectAll) selectAll.indeterminate = selectedCount() > 0 && !allSelected();
  });
  const header = (column: TableColumn, label: string, cls?: string) => (
    <Show
      when={!props.notWanted}
      fallback={
        <th scope="col" class={cls}>
          {label}
        </th>
      }
    >
      <SortHeader
        column={column}
        label={label}
        sort={props.sort}
        onSort={props.onSort}
        class={cls}
      />
    </Show>
  );

  return (
    <div class={styles.scroller} classList={{ [styles.notWanted]: props.notWanted }}>
      <table class={styles.table}>
        <caption class={u.visuallyHidden}>
          {props.notWanted ? t("listOrder.notWanted") : t("table.caption")}
        </caption>
        <thead>
          <tr>
            <th scope="col" class={styles.lead}>
              <Show
                when={props.canEdit && !props.notWanted}
                fallback={
                  <span class={u.visuallyHidden}>
                    {props.canEdit ? t("bulk.select") : t("item.details")}
                  </span>
                }
              >
                <input
                  ref={selectAll}
                  type="checkbox"
                  class={styles.check}
                  aria-label={t("table.selectAll")}
                  checked={allSelected()}
                  onChange={() => (allSelected() ? props.onSelectNone() : props.onSelectAll())}
                />
              </Show>
            </th>
            <th scope="col" class={styles.picture}>
              <span class={u.visuallyHidden}>{t("table.picture")}</span>
            </th>
            {header("name", t("table.item"))}
            <Show when={!props.notWanted}>{header("wanted", t("table.wanted"))}</Show>
            {header("category", t("table.category"))}
            <Show when={!props.notWanted}>
              {header("price", t("table.price"), styles.number)}
              <th scope="col">{t("table.shop")}</th>
            </Show>
            <Show when={props.canEdit}>
              <th scope="col">{t("table.visibleIn")}</th>
            </Show>
            {header("questions", t("table.questions"))}
            <Show
              when={props.showBought && !props.notWanted}
              fallback={
                <Show when={!props.notWanted || props.canEdit}>
                  <th scope="col" class={styles.status}>
                    <span class={u.visuallyHidden}>
                      {props.canEdit ? t("table.actions") : t("table.status")}
                    </span>
                  </th>
                </Show>
              }
            >
              {header("status", t("table.status"), styles.status)}
            </Show>
          </tr>
        </thead>
        <For each={props.items}>
          {(item) => <Row item={item} table={props} columns={columns()} />}
        </For>
      </table>
    </div>
  );
}
