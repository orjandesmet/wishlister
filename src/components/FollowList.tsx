import { createSignal, Show } from "solid-js";
import { locale, t } from "../lib/i18n.ts";
import { formatOccasionDate, type IsoDate } from "../lib/occasions.ts";

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
};

/** Follow someone's list until a date, change the date, or stop following. */
export function FollowList(props: FollowListProps) {
  const [editing, setEditing] = createSignal(false);
  const [date, setDate] = createSignal<IsoDate>("");
  const following = () => props.until !== null && props.until >= props.today;

  const startEditing = () => {
    setDate(following() ? props.until! : props.suggestedUntil);
    setEditing(true);
  };
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    props.onFollow(date());
    setEditing(false);
  };

  return (
    <section class="card follow">
      <Show
        when={editing()}
        fallback={
          <Show
            when={following()}
            fallback={
              <>
                <p class="muted small">{t("follow.pitch", { name: props.name })}</p>
                <div class="row">
                  <button type="button" class="small" disabled={props.busy} onClick={startEditing}>
                    {t("follow.follow")}
                  </button>
                </div>
              </>
            }
          >
            <p class="small">
              {t("follow.following", { date: formatOccasionDate(props.until!, locale()) })}
            </p>
            <div class="row">
              <button type="button" class="link" disabled={props.busy} onClick={startEditing}>
                {t("follow.changeDate")}
              </button>
              <button
                type="button"
                class="link danger"
                disabled={props.busy}
                onClick={() => props.onUnfollow()}
              >
                {t("follow.stop")}
              </button>
            </div>
          </Show>
        }
      >
        <form onSubmit={onSubmit}>
          <p class="muted small">{t("follow.pitch", { name: props.name })}</p>
          <label>
            {t("follow.until")}
            <input
              type="date"
              required
              min={props.today}
              value={date()}
              onInput={(e) => setDate(e.currentTarget.value)}
            />
          </label>
          <Show when={date() === props.suggestedUntil && props.suggestedOccasion}>
            {(occasion) => (
              <p class="muted small">{t("follow.untilOccasion", { occasion: occasion() })}</p>
            )}
          </Show>
          <div class="row">
            <button type="submit" disabled={props.busy}>
              {following() ? t("common.save") : t("follow.follow")}
            </button>
            <button type="button" class="secondary" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </Show>
    </section>
  );
}
