import { EditLabel } from "./EditLabel.tsx";
import { A } from "@solidjs/router";
import { createSignal, createUniqueId, For, Show } from "solid-js";
import type { Group, Member } from "../lib/api/groups.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { initialCollapsed, saveCollapsed } from "../lib/groupCollapse.ts";
import { compareNames, locale, t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { daysBetween, formatOccasionDate, type IsoDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
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
  /** Whether the members start collapsed; by default as you left them, or collapsed. */
  startCollapsed?: boolean;
};

/**
 * A group on the home page: its name, next occasion and a link to each member's list. The members
 * fold away so the next group is in reach; the member you drew in a Secret Santa stays in sight.
 */
export function GroupCard(props: GroupCardProps) {
  const members = () =>
    [...props.group.group_members].sort((a, b) =>
      compareNames(a.profiles.display_name, b.profiles.display_name),
    );
  // Read once: the card keeps its own state from then on (and saves it, if you want that).
  const [collapsed, setCollapsed] = createSignal(
    props.startCollapsed ?? initialCollapsed(props.group.id),
  );
  const toggle = () => {
    const next = !collapsed();
    setCollapsed(next);
    saveCollapsed(props.group.id, next);
  };
  /** While collapsed, the member you drew stays in sight, above the button. */
  const drawnWhileCollapsed = () =>
    collapsed() ? members().filter((m) => m.profile_id === props.drawnProfileId) : [];
  const membersId = createUniqueId();
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

  /** The soft accent line saying a Secret Santa is on. `showOccasion` names its occasion. */
  const secretSantaLine = (occasion: Occasion, showOccasion: boolean) => (
    <p class={styles.secretSanta}>
      <SecretSantaIcon class={styles.secretSantaIcon} />
      <span>
        {showOccasion
          ? t("groupCard.secretSantaFor", { occasion: occasion.name })
          : t("groupCard.secretSanta")}
        <Show when={!showOccasion}>
          <span class={u.visuallyHidden}> {occasion.name}</span>
        </Show>
      </span>
    </p>
  );

  const soon = (date: IsoDate) => daysBetween(props.today, date) <= 1;

  const memberRow = (member: Member) => (
    <li>
      {/* A guardian's own list isn't shown in this group, so there's nothing to open. */}
      <Show
        when={member.role !== "guardian"}
        fallback={
          <div class={u.listRow}>
            <Person id={member.profile_id} name={member.profiles.display_name} class={u.muted}>
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
  );

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
            <div class={styles.occasionText}>
              <p class={styles.nextOccasion} aria-hidden="true">
                {t("groupCard.occasionLine", {
                  name: occasion().name,
                  date: formatOccasionDate(occasion().date, locale()),
                })}
              </p>
              {/* Under the event name, when it's the Secret Santa of this very occasion. */}
              <Show when={props.secretSanta?.id === occasion().id ? props.secretSanta : undefined}>
                {(santa) => secretSantaLine(santa(), false)}
              </Show>
            </div>
          </div>
        )}
      </Show>
      {/* Running for another occasion than the next one: say which. */}
      <Show when={props.secretSanta?.id !== props.nextOccasion?.id ? props.secretSanta : undefined}>
        {(santa) => secretSantaLine(santa(), true)}
      </Show>
      {/* One block without the card's gap, so the drawn member, button and list sit close. */}
      <div class={styles.members}>
        <Show when={drawnWhileCollapsed().length > 0}>
          <ul class={u.list}>
            <For each={drawnWhileCollapsed()}>{memberRow}</For>
          </ul>
        </Show>
        <Button
          variant="link"
          class={styles.membersToggle}
          aria-expanded={!collapsed()}
          aria-controls={membersId}
          onClick={toggle}
        >
          {collapsed()
            ? t("groupCard.showMembers", { count: members().length })
            : t("groupCard.hideMembers")}
          <span class={u.visuallyHidden}>: {props.group.name}</span>
          {/* Lucide "chevron-down" (ISC licence). */}
          <svg
            class={styles.membersChevron}
            classList={{ [styles.open]: !collapsed() }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
        {/* Always in the page, even empty, so aria-controls points somewhere. */}
        <ul id={membersId} class={u.list}>
          <For each={collapsed() ? [] : members()}>{memberRow}</For>
        </ul>
      </div>
    </Card>
  );
}
