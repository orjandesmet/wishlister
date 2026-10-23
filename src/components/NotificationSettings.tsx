import { createSignal, For, Show } from "solid-js";
import { locale, t } from "../lib/i18n.ts";
import type { FollowedList } from "../lib/api/follows.ts";
import { formatOccasionDate, type IsoDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { BellIcon } from "./BellIcon.tsx";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { EditLabel } from "./EditLabel.tsx";
import { FollowDateForm } from "./FollowList.tsx";
import { Popover } from "./Popover.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import styles from "./NotificationSettings.module.css";

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

  return (
    <Card>
      <h2 class={styles.heading}>
        <BellIcon />
        {t("notifications.title")}
      </h2>
      <p class={`${u.muted} ${u.small}`}>{t("notifications.help")}</p>
      <Show when={props.follows.length} fallback={<p class={u.muted}>{t("notifications.none")}</p>}>
        <ul class={u.list}>
          <For each={props.follows}>
            {(follow) => (
              <li class={u.listRow}>
                <span>
                  {follow.name}
                  <br />
                  <span class={`${u.muted} ${u.small}`}>
                    {t("follow.untilDate", { date: formatOccasionDate(follow.until, locale()) })}
                  </span>
                </span>
                <span class={styles.rowActions}>
                  <Button
                    variant="link"
                    disabled={props.busy}
                    popovertarget="notification-popover"
                    onClick={() => startEditing(follow)}
                  >
                    <EditLabel label={t("follow.changeDate")} of={follow.name} />
                  </Button>
                  <Button
                    variant="link"
                    danger
                    disabled={props.busy}
                    onClick={() => props.onUnfollow(follow.listId)}
                  >
                    <RemoveLabel label={t("follow.stop")} of={follow.name} />
                  </Button>
                </span>
              </li>
            )}
          </For>
        </ul>
        <Button variant="link" danger disabled={props.busy} onClick={props.onUnfollowAll}>
          {t("notifications.unsubscribeAll")}
        </Button>
      </Show>
      <Popover id="notification-popover" anchor="--notifications" area="bottom span-right" sheet>
        <FollowDateForm
          title={t("follow.changeDate")}
          label={editing()?.name ?? ""}
          value={date()}
          min={props.today}
          submitLabel={t("common.save")}
          busy={props.busy}
          onInput={setDate}
          onSubmit={() => {
            props.onChangeDate(editing()!.listId, date());
            closePopover();
          }}
          onCancel={closePopover}
        />
      </Popover>
    </Card>
  );
}
