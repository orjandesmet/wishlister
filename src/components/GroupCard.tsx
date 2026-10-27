import { EditLabel } from "./EditLabel.tsx";
import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { Group } from "../lib/api/groups.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { compareNames, locale, t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { daysBetween, formatOccasionDate, type IsoDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { Card } from "./Card.tsx";
import { Chip } from "./Chip.tsx";
import { Person } from "./Person.tsx";
import { SecretSantaRibbon } from "./SecretSantaRibbon.tsx";
import { SecretSantaIcon } from "./SecretSantaIcon.tsx";
import styles from "./GroupCard.module.css";

export type GroupCardProps = {
  group: Group;
  /** Your own profile id, to mark "(you)" and pick Manage or Details. */
  myProfileId: ProfileId;
  /** The group's next occasion from today on, if it has one. */
  nextOccasion?: Occasion;
  /** The occasion of the group's running Secret Santa, if it has one. */
  secretSanta?: Occasion;
  /** The member you drew in that Secret Santa, who gets the badge. */
  drawnProfileId?: ProfileId;
  /** Today, to say how far away the next occasion is. */
  today: IsoDate;
};

/** A group on the home page: its name, next occasion and a link to each member's list. */
export function GroupCard(props: GroupCardProps) {
  const members = () =>
    [...props.group.group_members].sort((a, b) =>
      compareNames(a.profiles.display_name, b.profiles.display_name),
    );
  const isManager = () =>
    props.group.group_members.some(
      (m) => m.profile_id === props.myProfileId && m.role === "manager",
    );

  const when = (date: IsoDate) => {
    const days = daysBetween(props.today, date);
    if (days === 0) return t("groupCard.today");
    if (days === 1) return t("groupCard.tomorrow");
    return t("groupCard.inDays", { days });
  };

  const soon = (date: IsoDate) => daysBetween(props.today, date) <= 1;

  return (
    <Card class={styles.groupCard}>
      <div class={u.row}>
        <h2>{props.group.name}</h2>
        <A class={u.link} href={`/groups/${props.group.id}`}>
          <Show
            when={isManager()}
            fallback={
              <EditLabel icon="chevron" label={t("groupCard.details")} of={props.group.name} />
            }
          >
            <EditLabel label={t("groupCard.manage")} of={props.group.name} />
          </Show>
        </A>
      </div>
      <Show when={props.nextOccasion}>
        {(occasion) => (
          <div
            class={styles.countdown}
            role="group"
            aria-label={t("groupCard.nextOccasion", {
              name: occasion().name,
              date: formatOccasionDate(occasion().date, locale()),
              when: when(occasion().date),
            })}
          >
            <span
              class={styles.countdownTile}
              classList={{ [styles.soon]: soon(occasion().date) }}
              aria-hidden="true"
            >
              <Show
                when={daysBetween(props.today, occasion().date) > 1}
                fallback={<strong>{when(occasion().date)}</strong>}
              >
                <strong>{daysBetween(props.today, occasion().date)}</strong>
                <span>{t("groupCard.daysUnit")}</span>
              </Show>
            </span>
            <p class={styles.nextOccasion} aria-hidden="true">
              {t("groupCard.occasionLine", {
                name: occasion().name,
                date: formatOccasionDate(occasion().date, locale()),
              })}
            </p>
          </div>
        )}
      </Show>
      <Show when={props.secretSanta}>
        {(occasion) => (
          <p class={styles.secretSanta}>
            <SecretSantaIcon class={styles.secretSantaIcon} />
            <span>
              {t("groupCard.secretSanta")}
              <span class={u.visuallyHidden}> {occasion().name}</span>
            </span>
          </p>
        )}
      </Show>
      <ul class={u.list}>
        <For each={members()}>
          {(member) => (
            <li>
              {/* A guardian's own list isn't shown in this group, so there's nothing to open. */}
              <Show
                when={member.role !== "guardian"}
                fallback={
                  <div class={u.listRow}>
                    <Person
                      id={member.profile_id}
                      name={member.profiles.display_name}
                      class={u.muted}
                    >
                      {member.profiles.display_name}
                      {member.profile_id === props.myProfileId ? t("common.you") : ""}
                    </Person>
                    <Chip>{t("groupCard.guardian")}</Chip>
                  </div>
                }
              >
                <A class={u.listRow} href={`/lists/${member.profile_id}`}>
                  <Person id={member.profile_id} name={member.profiles.display_name}>
                    {member.profiles.display_name}
                    {member.profile_id === props.myProfileId ? t("common.you") : ""}
                    <Show when={member.profile_id === props.drawnProfileId}>
                      <SecretSantaRibbon iconOnly occasion={props.secretSanta?.name} />
                    </Show>
                  </Person>
                  <Show when={!member.profiles.account_id}>
                    <Chip>{t("groupCard.child")}</Chip>
                  </Show>
                </A>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </Card>
  );
}
