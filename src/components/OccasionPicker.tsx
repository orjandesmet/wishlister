import { createUniqueId, For } from "solid-js";
import type { Occasion } from "../lib/api/occasions.ts";
import { locale, t } from "../lib/i18n.ts";
import type { OccasionId } from "../lib/ids.ts";
import { formatOccasionDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";

export type OccasionPickerProps = {
  choices: Occasion[];
  /** null: not for an occasion. `event` is the click, for where the 💸 starts. */
  onPick: (occasionId: OccasionId | null, event: MouseEvent) => void;
  onCancel: () => void;
  /** Smaller buttons, as in the table. */
  small?: boolean;
  /** Extra class for each occasion's button. */
  buttonClass?: string;
  /** Class for the line with "Not for an occasion" and Cancel; a plain row by default. */
  rowClass?: string;
};

/**
 * Asked after "I bought this" when there are several occasions to buy the item for: a button
 * per occasion, one for none, and Cancel. The occasion buttons are `data-purchase`, so focus
 * can come back to them once the purchase is saved (createPurchaseRefocus).
 */
export function OccasionPicker(props: OccasionPickerProps) {
  const labelId = createUniqueId();
  const size = () => (props.small ? "small" : undefined);
  return (
    <div class={`${u.stack} ${u.smallGap}`} role="group" aria-labelledby={labelId}>
      <span class={u.fieldLabel} id={labelId}>
        {t("item.forWhichOccasion")}
      </span>
      <For each={props.choices}>
        {(occasion) => (
          <Button
            variant="secondary"
            size={size()}
            class={props.buttonClass}
            data-purchase
            onClick={(event) => props.onPick(occasion.id, event)}
          >
            {occasion.name} · {formatOccasionDate(occasion.date, locale())}
          </Button>
        )}
      </For>
      <div class={props.rowClass ?? u.row}>
        <Button variant="link" size={size()} onClick={(event) => props.onPick(null, event)}>
          {t("item.noOccasion")}
        </Button>
        <Button variant="link" size={size()} onClick={() => props.onCancel()}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
