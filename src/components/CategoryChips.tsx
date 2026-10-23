import { For, Show } from "solid-js";
import { ChipButton, Chips } from "./Chip.tsx";

export type CategoryChipsProps = {
  categories: string[];
  onPick: (category: string) => void;
};

/** Tappable category suggestions under the item form's category field. */
export function CategoryChips(props: CategoryChipsProps) {
  return (
    <Show when={props.categories.length > 0}>
      <Chips>
        <For each={props.categories}>
          {(c) => <ChipButton onClick={() => props.onPick(c)}>{c}</ChipButton>}
        </For>
      </Chips>
    </Show>
  );
}
