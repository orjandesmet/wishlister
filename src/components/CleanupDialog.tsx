import { createSignal, createUniqueId, For, onMount, Show } from "solid-js";
import { Button } from "./Button.tsx";
import { Check } from "./Check.tsx";
import type { CleanupItem } from "../lib/api/cleanup.ts";
import type { ItemId } from "../lib/ids.ts";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import styles from "./CleanupDialog.module.css";

export type CleanupDialogProps = {
  items: CleanupItem[];
  /** A child's name when a parent sees it on their child's list; left out on your own. */
  childName?: string;
  busy?: boolean;
  error?: string;
  /** OK: the checked items go, the unchecked ones stay and can be bought again. */
  onDone: (removeIds: ItemId[]) => void;
};

/**
 * After an occasion: "These items were bought for a past occasion and will be
 * removed", every one checked. Unchecking one keeps it on the list, buyable again.
 * Only OK: it opens by itself and Escape doesn't close it.
 */
export function CleanupDialog(props: CleanupDialogProps) {
  const titleId = createUniqueId();
  const [kept, setKept] = createSignal<ReadonlySet<ItemId>>(new Set());
  const toggle = (id: ItemId, remove: boolean) =>
    setKept((prev) => {
      const next = new Set(prev);
      if (remove) next.delete(id);
      else next.add(id);
      return next;
    });
  // oxlint-disable-next-line no-unassigned-vars
  let dialog: HTMLDialogElement | undefined;
  onMount(() => dialog?.showModal());
  return (
    <dialog
      ref={dialog}
      class={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => event.preventDefault()}
    >
      <form
        class={styles.body}
        onSubmit={(event) => {
          event.preventDefault();
          props.onDone(props.items.map((item) => item.item_id).filter((id) => !kept().has(id)));
        }}
      >
        <h2 id={titleId} class={styles.title}>
          {t("cleanup.title")}
        </h2>
        <p>
          {props.childName
            ? t("cleanup.introChild", { name: props.childName, count: props.items.length })
            : t("cleanup.intro", { count: props.items.length })}
        </p>
        <ul class={styles.items}>
          <For each={props.items}>
            {(item, index) => (
              <li>
                <Check>
                  <input
                    type="checkbox"
                    // Focus starts here rather than on the scrolling list or on OK.
                    autofocus={index() === 0}
                    checked={!kept().has(item.item_id)}
                    onChange={(e) => toggle(item.item_id, e.currentTarget.checked)}
                  />
                  <span class={styles.item}>
                    <span>{item.item_name}</span>
                    <span class={`${u.muted} ${u.small}`}>{item.occasion_name}</span>
                  </span>
                </Check>
              </li>
            )}
          </For>
        </ul>
        <p class={`${u.muted} ${u.small}`}>{t("cleanup.uncheckHint")}</p>
        <Show when={props.error}>
          <p class={u.error} role="alert">
            {props.error}
          </p>
        </Show>
        <Button type="submit" class={styles.ok} disabled={props.busy}>
          {props.busy ? t("common.saving") : t("cleanup.ok")}
        </Button>
      </form>
    </dialog>
  );
}
