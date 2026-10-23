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
  /** True for a moment after buying made you follow automatically: wiggles the bell and says so. */
  justFollowed?: boolean;
};

/** A bell beside the title; its popover follows someone's list until a date, changes the date, or stops following. */
export function FollowList(props: FollowListProps) {
  const [editing, setEditing] = createSignal(false);
  const [date, setDate] = createSignal<IsoDate>("");
  const following = () => props.until !== null && props.until >= props.today;

  const startEditing = () => {
    setDate(following() ? props.until! : props.suggestedUntil);
    setEditing(true);
  };
  const closePopover = () => document.getElementById("follow-popover")?.hidePopover();
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    props.onFollow(date());
    setEditing(false);
    closePopover();
  };

  return (
    <div class="follow">
      <button
        type="button"
        class="follow-button"
        classList={{ following: following(), wiggle: props.justFollowed }}
        popovertarget="follow-popover"
        aria-label={following() ? t("follow.stop") : t("follow.follow")}
        onClick={() => setEditing(false)}
      >
        {/* Lucide "bell" (ISC licence). */}
        <svg
          viewBox="0 0 24 24"
          fill={following() ? "currentColor" : "none"}
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </button>
      <Show when={props.justFollowed}>
        <span class="follow-tooltip" role="status">
          {t("follow.autoFollowed")}
        </span>
      </Show>
      <div id="follow-popover" class="popover sheet-popover follow-popover" popover>
        <Show
          when={editing()}
          fallback={
            <Show
              when={following()}
              fallback={
                <div class="follow-body">
                  <h2>{t("follow.title", { name: props.name })}</h2>
                  <p class="muted">{t("follow.pitch", { name: props.name })}</p>
                  <button type="button" disabled={props.busy} onClick={startEditing}>
                    {t("follow.follow")}
                  </button>
                </div>
              }
            >
              <div class="follow-body">
                <h2>{t("follow.followingTitle")}</h2>
                <p class="follow-until">
                  {t("follow.untilDate", { date: formatOccasionDate(props.until!, locale()) })}
                </p>
                <p class="muted">{t("follow.emailNote")}</p>
                <div class="follow-actions">
                  <button
                    type="button"
                    class="secondary"
                    disabled={props.busy}
                    onClick={startEditing}
                  >
                    {t("follow.changeDate")}
                  </button>
                  <button
                    type="button"
                    class="link danger"
                    disabled={props.busy}
                    onClick={() => {
                      props.onUnfollow();
                      closePopover();
                    }}
                  >
                    {t("follow.stop")}
                  </button>
                </div>
              </div>
            </Show>
          }
        >
          <form class="follow-body" onSubmit={onSubmit}>
            <h2>
              {following() ? t("follow.changeDate") : t("follow.title", { name: props.name })}
            </h2>
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
                <p class="muted">{t("follow.untilOccasion", { occasion: occasion() })}</p>
              )}
            </Show>
            <div class="follow-actions">
              <button type="submit" disabled={props.busy}>
                {following() ? t("common.save") : t("follow.follow")}
              </button>
              <button
                type="button"
                class="secondary"
                onClick={() => (setEditing(false), closePopover())}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
}
