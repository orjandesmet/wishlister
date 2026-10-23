import { createSignal, Show } from "solid-js";
import { BellIcon } from "./BellIcon.tsx";
import { Button } from "./Button.tsx";
import { Popover } from "./Popover.tsx";
import { focusSoon } from "../lib/a11y.ts";
import { locale, t } from "../lib/i18n.ts";
import { formatOccasionDate, type IsoDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import styles from "./FollowList.module.css";

export type FollowListProps = {
  /** Whose list it is, for the text. */
  name: string;
  /** Until when you follow this list; null when you don't (or it ended). */
  until: IsoDate | null;
  /** What the date picker starts at: the next occasion you share, or a month from now. */
  suggestedUntil: IsoDate;
  /** The occasion `suggestedUntil` comes from, if any. */
  suggestedOccasion?: string;
  today: IsoDate;
  busy?: boolean;
  onFollow: (until: IsoDate) => void;
  onUnfollow: () => void;
  /** True for a moment after buying made you follow automatically: wiggles the bell and says so. */
  justFollowed?: boolean;
};

export type FollowDateFormProps = {
  title: string;
  /** The date field's label. */
  label: string;
  value: IsoDate;
  min: IsoDate;
  /** A line under the field, such as the occasion the date comes from. */
  hint?: string;
  submitLabel: string;
  busy?: boolean;
  onInput: (date: IsoDate) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/** The form in a follow popover: until which date to follow a list. */
export function FollowDateForm(props: FollowDateFormProps) {
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <form class={styles.body} onSubmit={onSubmit}>
      <h2>{props.title}</h2>
      <label>
        {props.label}
        {/* Focused when its popover opens. */}
        <input
          type="date"
          autofocus
          required
          min={props.min}
          value={props.value}
          onInput={(e) => props.onInput(e.currentTarget.value)}
        />
      </label>
      <Show when={props.hint}>
        <p class={u.muted}>{props.hint}</p>
      </Show>
      <div class={styles.actions}>
        <button type="submit" disabled={props.busy}>
          {props.submitLabel}
        </button>
        <Button variant="secondary" onClick={() => props.onCancel()}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

/** A bell beside the title; its popover follows someone's list until a date, changes the date, or stops following. */
export function FollowList(props: FollowListProps) {
  const [editing, setEditing] = createSignal(false);
  const [date, setDate] = createSignal<IsoDate>("");
  const following = () => props.until !== null && props.until >= props.today;

  const popover = () => document.getElementById("follow-popover");
  // The popover is already open here, so its content swaps: focus moves into the new form.
  const startEditing = () => {
    setDate(following() ? props.until! : props.suggestedUntil);
    setEditing(true);
    focusSoon(() => popover()?.querySelector("input"));
  };
  // Closed before its content changes, while focus is still inside, so the browser hands
  // focus back to the bell.
  const closePopover = () => popover()?.hidePopover();

  return (
    <div class={styles.follow}>
      <button
        type="button"
        class={styles.followButton}
        classList={{ [styles.following]: following(), [styles.wiggle]: props.justFollowed }}
        popovertarget="follow-popover"
        aria-label={following() ? t("follow.stop") : t("follow.follow")}
        onClick={() => setEditing(false)}
      >
        <BellIcon filled={following()} />
      </button>
      <Show when={props.justFollowed}>
        <span class={styles.tooltip} role="status">
          {t("follow.autoFollowed")}
        </span>
      </Show>
      <Popover id="follow-popover" anchor="--follow-list" area="bottom span-right" sheet>
        <Show
          when={editing()}
          fallback={
            <Show
              when={following()}
              fallback={
                <div class={styles.body}>
                  <h2>{t("follow.title", { name: props.name })}</h2>
                  <p class={u.muted}>{t("follow.pitch", { name: props.name })}</p>
                  <button type="button" disabled={props.busy} onClick={startEditing}>
                    {t("follow.follow")}
                  </button>
                </div>
              }
            >
              <div class={styles.body}>
                <h2>{t("follow.followingTitle")}</h2>
                <p class={styles.until}>
                  {t("follow.untilDate", { date: formatOccasionDate(props.until!, locale()) })}
                </p>
                <p class={u.muted}>{t("follow.emailNote")}</p>
                <div class={styles.actions}>
                  <Button variant="secondary" disabled={props.busy} onClick={startEditing}>
                    {t("follow.changeDate")}
                  </Button>
                  <Button
                    variant="link"
                    danger
                    disabled={props.busy}
                    onClick={() => {
                      closePopover();
                      props.onUnfollow();
                    }}
                  >
                    {t("follow.stop")}
                  </Button>
                </div>
              </div>
            </Show>
          }
        >
          <FollowDateForm
            title={following() ? t("follow.changeDate") : t("follow.title", { name: props.name })}
            label={t("follow.until")}
            value={date()}
            min={props.today}
            hint={
              date() === props.suggestedUntil && props.suggestedOccasion
                ? t("follow.untilOccasion", { occasion: props.suggestedOccasion })
                : undefined
            }
            submitLabel={following() ? t("common.save") : t("follow.follow")}
            busy={props.busy}
            onInput={setDate}
            onSubmit={() => {
              closePopover();
              props.onFollow(date());
              setEditing(false);
            }}
            onCancel={() => (closePopover(), setEditing(false))}
          />
        </Show>
      </Popover>
    </div>
  );
}
