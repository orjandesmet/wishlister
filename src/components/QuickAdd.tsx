import { createSignal, For, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { PendingItem } from "../lib/quickAddQueue.ts";

export type QuickAddProps = {
  /** Items typed here that aren't saved yet, shown right away and locked. */
  pending: PendingItem[];
  /** The last save failed and will be tried again. */
  retrying: boolean;
  onAdd: (name: string) => void;
  /** Stops retrying and removes the pending items. */
  onCancel: () => void;
};

/**
 * One field to add items fast: type a name, press Enter, type the next one.
 * Saving happens elsewhere; this only shows the pending items and the field.
 */
export function QuickAdd(props: QuickAddProps) {
  const [name, setName] = createSignal("");

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!name().trim()) return;
    props.onAdd(name());
    // The input keeps focus, so the (on-screen) keyboard stays open for the next item.
    setName("");
  }

  return (
    <section class="stack">
      <Show when={props.pending.length > 0}>
        <ul class="list cards">
          <For each={props.pending}>
            {(item) => (
              <li class="card item pending">
                <strong class="item-name">{item.name}</strong>
                <span class="muted small">
                  {props.retrying ? t("quickAdd.notSaved") : t("quickAdd.saving")}
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.retrying}>
        <div class="row" role="alert">
          <p class="error small">{t("quickAdd.retrying")}</p>
          <button type="button" class="secondary small" onClick={() => props.onCancel()}>
            {t("common.cancel")}
          </button>
        </div>
      </Show>
      <form class="card" onSubmit={onSubmit}>
        <label>
          {t("quickAdd.label")}
          <input
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder={t("quickAdd.placeholder")}
            enterkeyhint="go"
            autocomplete="off"
          />
        </label>
      </form>
    </section>
  );
}
