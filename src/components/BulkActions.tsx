import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import { focusSoon } from "../lib/a11y.ts";
import type { GroupSelection } from "../lib/api/items.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId } from "../lib/ids.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { CategoryChips } from "./CategoryChips.tsx";
import { Check } from "./Check.tsx";
import styles from "./BulkActions.module.css";

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

  // Switching panels replaces the buttons, so focus moves along: into the form that opened,
  // and back to the button that opened it (or the bar, while that button waits on a save).
  // oxlint-disable-next-line no-unassigned-vars
  let bar: HTMLElement | undefined;
  const open = (next: "category" | "groups") => {
    setPanel(next);
    focusSoon(() => bar?.querySelector<HTMLElement>("input:not([type=radio]), input:checked"));
  };
  const close = () => {
    const from = panel();
    setPanel("actions");
    focusSoon(() => {
      const button = bar?.querySelector<HTMLButtonElement>(`[data-panel="${from}"]`);
      return button && !button.disabled ? button : bar;
    });
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
    <Card ref={bar} class={styles.bulkActions} aria-label={t("bulk.title")} tabIndex={-1}>
      <div class={u.row}>
        <strong aria-live="polite">{t("bulk.selected", { count: props.selected })}</strong>
        <Show
          when={props.selected < props.total}
          fallback={
            <Button variant="link" onClick={() => props.onSelectNone()}>
              {t("bulk.selectNone")}
            </Button>
          }
        >
          <Button variant="link" onClick={() => props.onSelectAll()}>
            {t("bulk.selectAll")}
          </Button>
        </Show>
      </div>
      <Switch>
        <Match when={panel() === "actions"}>
          <div class={styles.buttons}>
            <Button
              variant="secondary"
              size="small"
              disabled={nothing()}
              data-panel="category"
              onClick={() => open("category")}
            >
              {t("bulk.setCategory")}
            </Button>
            <Button
              variant="secondary"
              size="small"
              disabled={nothing()}
              data-panel="groups"
              onClick={() => open("groups")}
            >
              {t("bulk.setGroups")}
            </Button>
            <Button
              variant="secondary"
              danger
              size="small"
              disabled={nothing()}
              onClick={() => props.onDelete()}
            >
              {t("common.delete")}
            </Button>
            <Button size="small" onClick={() => props.onDone()}>
              {t("bulk.done")}
            </Button>
          </div>
        </Match>
        <Match when={panel() === "category"}>
          <form class={u.stack} onSubmit={applyCategory}>
            <label>
              {t("bulk.categoryLabel")}
              <input
                value={category()}
                onInput={(e) => setCategory(e.currentTarget.value)}
                placeholder={t("bulk.categoryPlaceholder")}
                enterkeyhint="done"
                autocomplete="off"
              />
            </label>
            <CategoryChips
              categories={chips()}
              onPick={(picked) => {
                setCategory(picked);
                // The picked chip may drop out of the suggestions: back to the field.
                focusSoon(() => bar?.querySelector<HTMLElement>("input"));
              }}
            />
            <div class={styles.buttons}>
              <Button size="small" type="submit" disabled={nothing()}>
                {category().trim() ? t("bulk.apply") : t("bulk.clearCategory")}
              </Button>
              <Button variant="secondary" size="small" onClick={close}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Match>
        <Match when={panel() === "groups"}>
          <form class={u.stack} onSubmit={applyGroups}>
            <fieldset>
              <legend>{t("itemForm.visibility")}</legend>
              <Check>
                <input
                  type="radio"
                  name="bulk-visibility"
                  checked={visibility() === "all"}
                  onChange={() => setVisibility("all")}
                />
                {t("itemForm.allGroups")}
              </Check>
              <Check>
                <input
                  type="radio"
                  name="bulk-visibility"
                  checked={visibility() === "some"}
                  onChange={() => setVisibility("some")}
                />
                {t("itemForm.selectedGroups")}
              </Check>
              <Show when={visibility() === "some"}>
                <div class={u.indent}>
                  <For
                    each={props.groups}
                    fallback={<p class={`${u.muted} ${u.small}`}>{t("itemForm.noGroups")}</p>}
                  >
                    {(group) => (
                      <Check>
                        <input
                          type="checkbox"
                          checked={groupIds().includes(group.id)}
                          onChange={(e) => toggleGroup(group.id, e.currentTarget.checked)}
                        />
                        {group.name}
                      </Check>
                    )}
                  </For>
                </div>
              </Show>
              <Check>
                <input
                  type="radio"
                  name="bulk-visibility"
                  checked={visibility() === "none"}
                  onChange={() => setVisibility("none")}
                />
                {t("itemForm.noGroupsOption")}
              </Check>
            </fieldset>
            <div class={styles.buttons}>
              <Button size="small" type="submit" disabled={nothing()}>
                {t("bulk.apply")}
              </Button>
              <Button variant="secondary" size="small" onClick={close}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Match>
      </Switch>
    </Card>
  );
}
