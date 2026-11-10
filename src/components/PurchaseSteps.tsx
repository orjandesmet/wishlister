import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Icon } from "./Icon.tsx";
import { YouBoughtFor } from "./YouBoughtFor.tsx";
import styles from "./PurchaseSteps.module.css";

export type PurchaseStepsProps = {
  /** The item's name, added for screen readers to Undo and Delivered. */
  name: string;
  /** The occasion you bought it for, shown with "You bought this". */
  boughtFor?: string;
  /** Called when Undo is pressed; the host moves focus and undoes the purchase. */
  onUndo: () => void;
  /**
   * The "Delivered" tick. Left out, there is only the pill with Undo (the setting "Show
   * delivery status on item cards" is off).
   */
  delivered?: boolean;
  onDelivered?: (delivered: boolean) => void;
  /** Slightly smaller, for compact cards and table rows. */
  compact?: boolean;
  class?: string;
};

/**
 * Your own purchase: a green "You bought this" pill that ends in a red Undo, and, with delivery
 * status on, the "Delivered" tick as the next step. Inside a narrow container (a card under
 * about 340px) the words Undo and Delivered turn into icons; screen readers always hear them.
 */
export function PurchaseSteps(props: PurchaseStepsProps) {
  return (
    <div
      class={`${styles.steps} ${props.class ?? ""}`}
      classList={{ [styles.stepsPlain]: !props.onDelivered, [styles.compact]: props.compact }}
    >
      <span class={styles.stepBought}>
        <span class={styles.stepText}>
          <span>
            {props.boughtFor ? <YouBoughtFor occasion={props.boughtFor} /> : t("item.youBought")}
          </span>
        </span>
        <button
          type="button"
          class={styles.undoCap}
          data-purchase
          title={t("item.undo")}
          onClick={() => props.onUndo()}
        >
          {/* Lucide "undo-2" (ISC licence). */}
          <Icon>
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
          </Icon>
          <span class={styles.stepWord}>{t("item.undo")}</span>
          <span class={u.visuallyHidden}>: {props.name}</span>
        </button>
      </span>
      <Show when={props.onDelivered}>
        {(onDelivered) => (
          <>
            <span
              class={styles.connector}
              classList={{ [styles.connectorOn]: props.delivered }}
              aria-hidden="true"
            />
            <label
              class={styles.stepDelivered}
              classList={{ [styles.stepDeliveredOn]: props.delivered }}
              title={t("item.delivered")}
            >
              <input
                type="checkbox"
                class={styles.deliveredBox}
                checked={props.delivered ?? false}
                onChange={(event) => onDelivered()(event.currentTarget.checked)}
              />
              {/* A house with a parcel in front of it: shown instead of the word. */}
              <Icon class={styles.stepIcon} strokeWidth={1.75}>
                <path d="M2 10.5 8.5 4 13 8.5" />
                <path d="M4 9v10a1 1 0 0 0 1 1h2" />
                <path d="m16 9.5 6.5 3.5v7L16 23.5 9.5 20v-7z" />
                <path d="m9.5 13 6.5 3.5L22.5 13M16 16.5v7" />
              </Icon>
              <span class={styles.stepWord}>{t("item.delivered")}</span>
              <span class={u.visuallyHidden}>: {props.name}</span>
            </label>
          </>
        )}
      </Show>
    </div>
  );
}
