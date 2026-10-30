import { Show } from "solid-js";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import styles from "./CleanupPrompt.module.css";

export type CleanupPromptProps = {
  /** The occasion that passed, like "Christmas 2026". */
  occasion: string;
  /** How many items on the list were bought for it. */
  count: number;
  /** A child's name when a parent sees it on their child's list; left out on your own. */
  childName?: string;
  /** Some items on the list are kept on it: say they stay. */
  hasKeptItems?: boolean;
  busy?: boolean;
  onRemove: () => void;
  onKeep: () => void;
};

/**
 * After an occasion: "N items on your list were bought for <occasion>. Remove them?"
 * Only shown from the day after, to the list's editors. Nothing goes without their yes.
 */
export function CleanupPrompt(props: CleanupPromptProps) {
  return (
    <Card as="aside" class={styles.prompt} aria-label={t("cleanup.label")}>
      <p>
        {props.childName
          ? t("cleanup.questionChild", {
              count: props.count,
              occasion: props.occasion,
              name: props.childName,
            })
          : t("cleanup.question", { count: props.count, occasion: props.occasion })}
      </p>
      <Show when={props.hasKeptItems}>
        <p class={`${u.muted} ${u.small}`}>{t("cleanup.keptItemsStay")}</p>
      </Show>
      <div class={styles.actions}>
        <Button size="small" disabled={props.busy} onClick={() => props.onRemove()}>
          {t("cleanup.remove")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          disabled={props.busy}
          onClick={() => props.onKeep()}
        >
          {t("cleanup.keep")}
        </Button>
      </div>
    </Card>
  );
}

/** Right after a cleanup: what happened, with an undo. */
export function CleanupDone(props: {
  message: string;
  busy?: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card as="aside" class={styles.prompt} aria-label={t("cleanup.label")}>
      <p>{props.message}</p>
      <div class={styles.actions}>
        <Button
          size="small"
          variant="secondary"
          disabled={props.busy}
          onClick={() => props.onUndo()}
        >
          {t("cleanup.undo")}
        </Button>
        <Button size="small" variant="link" disabled={props.busy} onClick={() => props.onDismiss()}>
          {t("cleanup.dismiss")}
        </Button>
      </div>
    </Card>
  );
}
