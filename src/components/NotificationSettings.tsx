import { createSignal, For, Show } from "solid-js";
import { locale, t } from "../lib/i18n.ts";
import type { FollowedList } from "../lib/api/follows.ts";
import { formatOccasionDate, type IsoDate } from "../lib/occasions.ts";
import { BellIcon } from "./BellIcon.tsx";
import { EditLabel } from "./EditLabel.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";

export type NotificationSettingsProps = {
  follows: FollowedList[];
  today: IsoDate;
  busy?: boolean;
  onChangeDate: (listId: FollowedList["listId"], until: IsoDate) => void;
  onUnfollow: (listId: FollowedList["listId"]) => void;
  onUnfollowAll: () => void;
};

/** The lists you get emails about, each with its end date to change or stop, plus a way to stop them all. */
export function NotificationSettings(props: NotificationSettingsProps) {
  const [editing, setEditing] = createSignal<FollowedList>();
  const [date, setDate] = createSignal<IsoDate>("");

  const startEditing = (follow: FollowedList) => {
    setDate(follow.until);
    setEditing(follow);
  };
  const closePopover = () => document.getElementById("notification-popover")?.hidePopover();
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    props.onChangeDate(editing()!.listId, date());
    closePopover();
  };

  return (
    <section class="card notifications">
      <h2 class="icon-heading">
        <BellIcon />
        {t("notifications.title")}
      </h2>
      <p class="muted small">{t("notifications.help")}</p>
      <Show when={props.follows.length} fallback={<p class="muted">{t("notifications.none")}</p>}>
        <ul class="list">
          <For each={props.follows}>
            {(follow) => (
              <li class="list-row">
                <span>
                  {follow.name}
                  <br />
                  <span class="muted small">
                    {t("follow.untilDate", { date: formatOccasionDate(follow.until, locale()) })}
                  </span>
                </span>
                <span class="row-actions">
                  <button
                    type="button"
                    class="link"
                    disabled={props.busy}
                    popovertarget="notification-popover"
                    onClick={() => startEditing(follow)}
                  >
                    <EditLabel label={t("follow.changeDate")} />
                  </button>
                  <button
                    type="button"
                    class="link danger"
                    disabled={props.busy}
                    onClick={() => props.onUnfollow(follow.listId)}
                  >
                    <RemoveLabel label={t("follow.stop")} />
                  </button>
                </span>
              </li>
            )}
          </For>
        </ul>
        <button
          type="button"
          class="link danger"
          disabled={props.busy}
          onClick={props.onUnfollowAll}
        >
          {t("notifications.unsubscribeAll")}
        </button>
      </Show>
      <div
        id="notification-popover"
        class="popover sheet-popover follow-popover notification-popover"
        popover
      >
        <form class="follow-body" onSubmit={onSubmit}>
          <h2>{t("follow.changeDate")}</h2>
          <label>
            {editing()?.name}
            <input
              type="date"
              required
              min={props.today}
              value={date()}
              onInput={(e) => setDate(e.currentTarget.value)}
            />
          </label>
          <div class="follow-actions">
            <button type="submit" disabled={props.busy}>
              {t("common.save")}
            </button>
            <button type="button" class="secondary" onClick={closePopover}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
