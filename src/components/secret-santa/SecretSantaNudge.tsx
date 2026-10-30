import { createUniqueId, Show } from "solid-js";
import { t } from "../../lib/i18n.ts";
import u from "../../utilities.module.css";
import { Button } from "../Button.tsx";
import styles from "./SecretSantaNudge.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SecretSantaNudgeProps = {
  /** The person you drew. */
  name: string;
  /** When you last nudged them (ISO timestamp), or null. */
  lastNudgedAt: string | null;
  /** Days between two nudges. */
  everyDays: number;
  now: Date;
  busy?: boolean;
  onNudge: () => void;
};

/** Whole days between a nudge and now: 0 is less than a day ago. */
export function daysSinceNudge(lastNudgedAt: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(lastNudgedAt).getTime()) / DAY_MS));
}

/**
 * On the list of the person you drew, when it has few items you could buy: asks them by email
 * for some ideas, without your name. Disabled for a few days after a nudge, and says when it
 * was sent.
 */
export function SecretSantaNudge(props: SecretSantaNudgeProps) {
  const daysAgo = () =>
    props.lastNudgedAt === null ? null : daysSinceNudge(props.lastNudgedAt, props.now);
  const whenId = createUniqueId();
  const tooSoon = () => {
    const days = daysAgo();
    return days !== null && days < props.everyDays;
  };
  return (
    <div class={styles.nudge}>
      <p class={u.small}>{t("secretSanta.nudgeHelp", { name: props.name })}</p>
      <div class={u.row}>
        <Button
          variant="secondary"
          size="small"
          disabled={tooSoon() || props.busy}
          aria-describedby={tooSoon() ? whenId : undefined}
          onClick={() => props.onNudge()}
        >
          {props.busy ? t("secretSanta.nudging") : t("secretSanta.nudge", { name: props.name })}
        </Button>
        <Show when={daysAgo() !== null}>
          <span id={whenId} class={`${u.muted} ${u.small}`}>
            {t("secretSanta.nudged", { days: daysAgo()! })}
          </span>
        </Show>
      </div>
    </div>
  );
}
