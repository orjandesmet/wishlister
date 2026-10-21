import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import { focusSoon } from "../lib/a11y.ts";
import type { GroupSelection } from "../lib/api/items.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId } from "../lib/ids.ts";
import { CategoryChips } from "./CategoryChips.tsx";

export type BulkActionsProps = {
  /** How many items are ticked, and how many there are. */
  selected: number;
  total: number;
  /** Groups the list is shown in, to pick who sees the items. */
  groups: { id: GroupId; name: string }[];
  /** Category suggestions for what's typed so far, like under the item form's field. */
  suggestCategories: (typed: string) => string[];
  /** An action is saving: the buttons wait. */
  busy: boolean;
  onSelectAll: () => void;
  onSelectNone: () => void;
  /** null clears the category. */
  onSetCategory: (category: string | null) => void;
  onSetGroups: (groups: GroupSelection) => void;
  onDelete: () => void;
  onDone: () => void;
};

/**
 * The bar under a list while picking items: what's ticked, and what to do with them.
 * Category and groups open a small form in the bar itself, so it stays one tap away
 * from the list on a phone. Saving happens elsewhere.
 */
export function BulkActions(props: BulkActionsProps) {
  const [panel, setPanel] = createSignal<"actions" | "category" | "groups">("actions");
  const [category, setCategory] = createSignal("");
  const chips = createMemo(() => props.suggestCategories(category()));
  /** "some" with nothing ticked saves the same as "none". */
  const [visibility, setVisibility] = createSignal<"all" | "some" | "none">("all");
  const [groupIds, setGroupIds] = createSignal<GroupId[]>([]);
  const toggleGroup = (id: GroupId, checked: boolean) =>
    setGroupIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));

  const nothing = () => props.selected === 0 || props.busy;

  // Switching panels replaces the buttons, so focus moves along: into the form that
  // opened, and back to the button that opened it.
  let categoryButton: HTMLButtonElement | undefined;
  let groupsButton: HTMLButtonElement | undefined;
  let categoryInput: HTMLInputElement | undefined;
  let groupsFieldset: HTMLFieldSetElement | undefined;
  let bar: HTMLElement | undefined;
  const open = (next: "category" | "groups") => {
    setPanel(next);
    focusSoon(() =>
      next === "category" ? categoryInput : groupsFieldset?.querySelector("input:checked"),
    );
  };
  const close = () => {
    const from = panel();
    setPanel("actions");
    focusSoon(() => {
      const button = from === "category" ? categoryButton : groupsButton;
      // Disabled while the change saves; the bar itself then holds focus.
      return button && !button.disabled ? button : bar;
    });
  };
  const pickCategory = (picked: string) => {
    setCategory(picked);
    focusSoon(() => categoryInput);
  };

  function applyCategory(event: SubmitEvent) {
    event.preventDefault();
    props.onSetCategory(category().trim() || null);
    close();
  }
  function applyGroups(event: SubmitEvent) {
    event.preventDefault();
    const v = visibility();
    props.onSetGroups(v === "all" ? "all" : v === "some" ? groupIds() : []);
    close();
  }

  return (
    <section
      ref={(el) => (bar = el)}
      class="card bulk-actions"
      aria-label={t("bulk.title")}
      tabIndex={-1}
    >
      <div class="row">
        <strong class="bulk-count" aria-live="polite">
          {t("bulk.selected", { count: props.selected })}
        </strong>
        <Show
          when={props.selected < props.total}
          fallback={
            <button type="button" class="link" onClick={() => props.onSelectNone()}>
              {t("bulk.selectNone")}
            </button>
          }
        >
          <button type="button" class="link" onClick={() => props.onSelectAll()}>
            {t("bulk.selectAll")}
          </button>
        </Show>
      </div>
      <Switch>
        <Match when={panel() === "actions"}>
          <div class="bulk-buttons">
            <button
              ref={(el) => (categoryButton = el)}
              type="button"
              class="secondary small"
              disabled={nothing()}
              onClick={() => open("category")}
            >
              {t("bulk.setCategory")}
            </button>
            <button
              ref={(el) => (groupsButton = el)}
              type="button"
              class="secondary small"
              disabled={nothing()}
              onClick={() => open("groups")}
            >
              {t("bulk.setGroups")}
            </button>
            <button
              type="button"
              class="secondary small danger"
              disabled={nothing()}
              onClick={() => props.onDelete()}
            >
              {t("common.delete")}
            </button>
            <button type="button" class="small" onClick={() => props.onDone()}>
              {t("bulk.done")}
            </button>
          </div>
        </Match>
        <Match when={panel() === "category"}>
          <form class="stack" onSubmit={applyCategory}>
            <label>
              {t("bulk.categoryLabel")}
              <input
                ref={(el) => (categoryInput = el)}
                value={category()}
                onInput={(e) => setCategory(e.currentTarget.value)}
                placeholder={t("bulk.categoryPlaceholder")}
                enterkeyhint="done"
                autocomplete="off"
              />
            </label>
            <CategoryChips categories={chips()} onPick={pickCategory} />
            <div class="bulk-buttons">
              <button type="submit" class="small" disabled={nothing()}>
                {category().trim() ? t("bulk.apply") : t("bulk.clearCategory")}
              </button>
              <button type="button" class="secondary small" onClick={close}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </Match>
        <Match when={panel() === "groups"}>
          <form class="stack" onSubmit={applyGroups}>
            <fieldset ref={(el) => (groupsFieldset = el)}>
              <legend>{t("itemForm.visibility")}</legend>
              <label class="check">
                <input
                  type="radio"
                  name="bulk-visibility"
                  checked={visibility() === "all"}
                  onChange={() => setVisibility("all")}
                />
                {t("itemForm.allGroups")}
              </label>
              <label class="check">
                <input
                  type="radio"
                  name="bulk-visibility"
                  checked={visibility() === "some"}
                  onChange={() => setVisibility("some")}
                />
                {t("itemForm.selectedGroups")}
              </label>
              <Show when={visibility() === "some"}>
                <div class="indent">
                  <For
                    each={props.groups}
                    fallback={<p class="muted small">{t("itemForm.noGroups")}</p>}
                  >
                    {(group) => (
                      <label class="check">
                        <input
                          type="checkbox"
                          checked={groupIds().includes(group.id)}
                          onChange={(e) => toggleGroup(group.id, e.currentTarget.checked)}
                        />
                        {group.name}
                      </label>
                    )}
                  </For>
                </div>
              </Show>
              <label class="check">
                <input
                  type="radio"
                  name="bulk-visibility"
                  checked={visibility() === "none"}
                  onChange={() => setVisibility("none")}
                />
                {t("itemForm.noGroupsOption")}
              </label>
            </fieldset>
            <div class="bulk-buttons">
              <button type="submit" class="small" disabled={nothing()}>
                {t("bulk.apply")}
              </button>
              <button type="button" class="secondary small" onClick={close}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </Match>
      </Switch>
    </section>
  );
}
