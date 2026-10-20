import { createSignal, For, Show } from "solid-js";
import type { GroupSelection } from "../lib/api/items.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId } from "../lib/ids.ts";
import type { PendingItem } from "../lib/quickAddQueue.ts";

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
};

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

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!name().trim()) return;
    props.onAdd(name(), groups());
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
        <div class="stack small-gap">
          <span class="field-label">{t("quickAdd.visibleIn")}</span>
          <div class="chips" role="group" aria-label={t("quickAdd.visibleIn")}>
            <button
              type="button"
              class="chip-button"
              aria-pressed={groups() === "all"}
              onClick={() => setGroups(groups() === "all" ? [] : "all")}
            >
              {t("quickAdd.allGroups")}
            </button>
            <For each={props.groups}>
              {(group) => (
                <button
                  type="button"
                  class="chip-button"
                  aria-pressed={isPicked(group.id)}
                  onClick={() => toggle(group.id)}
                >
                  {group.name}
                </button>
              )}
            </For>
          </div>
          <Show when={groups() !== "all" && groups().length === 0}>
            <p class="muted small">{t("quickAdd.noGroupsHint")}</p>
          </Show>
        </div>
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
