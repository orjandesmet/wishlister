import { createSignal, For, onMount, Show } from "solid-js";
import type { GroupSelection } from "../lib/api/items.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId } from "../lib/ids.ts";
import type { ItemDraft } from "../lib/itemDraft.ts";
import type { PendingItem } from "../lib/quickAddQueue.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { ChipButton, Chips } from "./Chip.tsx";
import { PendingItemCard } from "./ItemCard.tsx";
import { Popover } from "./Popover.tsx";
import styles from "./QuickAdd.module.css";

export type QuickAddProps = {
  /** Items typed here that aren't saved yet, shown right away and locked. */
  pending: PendingItem<unknown>[];
  /** Groups the list is shown in, to pick who sees the new items. */
  groups: { id: GroupId; name: string }[];
  /** The last save failed and will be tried again. */
  retrying: boolean;
  /** Gets the groups picked at the time, so each item keeps its own choice. */
  onAdd: (name: string, groups: GroupSelection) => void;
  /** Stops retrying and removes the pending items. */
  onCancel: () => void;
  /** Goes to the full item form, taking along what was typed and the groups picked. */
  onOpenForm: (draft: ItemDraft) => void;
  /** Show the popover right away instead of waiting for the floating button. */
  initiallyOpen?: boolean;
};

/**
 * Opens the quick add popover. Floating and shy by default; `inline` keeps its text, for an
 * empty list where it is the one thing to do.
 */
export function QuickAddButton(props: { inline?: boolean }) {
  return (
    <button
      type="button"
      class={props.inline ? styles.inline : styles.fab}
      aria-label={props.inline ? undefined : t("quickAdd.label")}
      popovertarget="quick-add-popover"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M13 2 4 14h7l-1 8 7-10h-7z" />
        <path d="M19 3v6M16 6h6" />
      </svg>
      <span
        class={props.inline ? undefined : styles.fabLabel}
        aria-hidden={props.inline ? undefined : true}
      >
        {t("quickAdd.label")}
      </span>
    </button>
  );
}

/**
 * One field to add items fast: type a name, press Enter, type the next one.
 * Saving happens elsewhere; this only shows the pending items and the field.
 */
export function QuickAdd(props: QuickAddProps) {
  const [name, setName] = createSignal("");
  // Starts with no groups, and stays as picked for the next items.
  const [groups, setGroups] = createSignal<GroupSelection>([]);
  const isPicked = (id: GroupId) => {
    const picked = groups();
    return picked !== "all" && picked.includes(id);
  };
  const toggle = (id: GroupId) => {
    const picked = groups();
    const ids = picked === "all" ? [] : picked;
    setGroups(ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]);
  };

  function add() {
    if (!name().trim()) return;
    props.onAdd(name(), groups());
    setName("");
  }

  /** Enter: adds the item and stays open. The input keeps focus, so the (on-screen) keyboard stays up for the next item. */
  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    add();
  }

  /**
   * The button: adds what was typed (if anything) and closes the sheet, for when you're done.
   * Not a submit button, because Enter clicks the form's submit button and should keep it open.
   */
  function addAndClose() {
    add();
    const el = popover();
    if (el?.matches(":popover-open")) el.hidePopover();
  }

  const [popover, setPopover] = createSignal<HTMLDivElement>();
  onMount(() => {
    if (props.initiallyOpen) popover()?.showPopover();
  });

  return (
    <section class={`${u.stack} ${styles.quickAdd}`}>
      <div class={`${u.stack} ${styles.inner}`}>
        <Show when={props.pending.length > 0}>
          <ul class={`${u.list} ${u.cards}`}>
            <For each={props.pending}>
              {(item) => (
                <PendingItemCard
                  name={item.name}
                  status={props.retrying ? t("quickAdd.notSaved") : t("quickAdd.saving")}
                />
              )}
            </For>
          </ul>
        </Show>
        <Show when={props.retrying}>
          <div class={u.row} role="alert">
            <p class={`${u.error} ${u.small}`}>{t("quickAdd.retrying")}</p>
            <Button variant="secondary" size="small" onClick={() => props.onCancel()}>
              {t("common.cancel")}
            </Button>
          </div>
        </Show>
        <QuickAddButton />
        <Popover
          id="quick-add-popover"
          ref={setPopover}
          anchor="--quick-add"
          area="top span-left"
          margin="0 0 8px"
          sheet
          class={styles.popover}
        >
          <form class={u.stack} onSubmit={onSubmit}>
            <h2 class={styles.title}>{t("quickAdd.label")}</h2>
            <input
              autofocus
              aria-label={t("quickAdd.label")}
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder={t("quickAdd.placeholder")}
              enterkeyhint="go"
              autocomplete="off"
            />
            <p class={`${u.muted} ${u.small}`}>{t("quickAdd.notWantedHint")}</p>
            <div class={`${u.stack} ${u.smallGap}`}>
              <span class={u.fieldLabel}>{t("quickAdd.visibleIn")}</span>
              <Chips role="group" aria-label={t("quickAdd.visibleIn")}>
                <ChipButton
                  aria-pressed={groups() === "all"}
                  onClick={() => setGroups(groups() === "all" ? [] : "all")}
                >
                  {t("quickAdd.allGroups")}
                </ChipButton>
                <For each={props.groups}>
                  {(group) => (
                    <ChipButton aria-pressed={isPicked(group.id)} onClick={() => toggle(group.id)}>
                      {group.name}
                    </ChipButton>
                  )}
                </For>
              </Chips>
              <Show when={groups() !== "all" && groups().length === 0}>
                <p class={`${u.muted} ${u.small}`}>{t("quickAdd.noGroupsHint")}</p>
              </Show>
            </div>
            <div class={`${u.row} ${styles.actions}`}>
              <Button
                variant="link"
                onClick={() => props.onOpenForm({ text: name(), groups: groups() })}
              >
                {t("quickAdd.moreOptions")}
              </Button>
              <Button variant="primary" onClick={addAndClose}>
                {t("quickAdd.submit")}
              </Button>
            </div>
          </form>
        </Popover>
      </div>
    </section>
  );
}
