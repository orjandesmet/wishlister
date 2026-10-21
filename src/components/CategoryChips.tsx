import { For, Show } from "solid-js";
import { t } from "../lib/i18n.ts";

export type CategoryChipsProps = {
  categories: string[];
  onPick: (category: string) => void;
};

/** Tappable category suggestions under the item form's category field. */
export function CategoryChips(props: CategoryChipsProps) {
  return (
    <Show when={props.categories.length > 0}>
      <div class="chips" role="group" aria-label={t("a11y.categorySuggestions")}>
        <For each={props.categories}>
          {(c) => (
            <button type="button" class="chip-button" onClick={() => props.onPick(c)}>
              {c}
            </button>
          )}
        </For>
      </div>
    </Show>
  );
}
