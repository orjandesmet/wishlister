import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { Group } from "../lib/api/groups.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { compareNames, locale, t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { daysBetween, formatOccasionDate, type IsoDate } from "../lib/occasions.ts";

export type GroupCardProps = {
  group: Group;
  /** Your own profile id, to mark "(you)" and pick Manage or Details. */
  myProfileId: ProfileId;
  /** The group's next occasion from today on, if it has one. */
  nextOccasion?: Occasion;
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

  return (
    <section class="card">
      <div class="row">
        <h2>{props.group.name}</h2>
        <A class="link" href={`/groups/${props.group.id}`}>
          {isManager() ? t("groupCard.manage") : t("groupCard.details")}
        </A>
      </div>
      <Show when={props.nextOccasion}>
        {(occasion) => (
          <p class="muted small">
            {t("groupCard.nextOccasion", {
              name: occasion().name,
              date: formatOccasionDate(occasion().date, locale()),
              when: when(occasion().date),
            })}
          </p>
        )}
      </Show>
      <ul class="list">
        <For each={members()}>
          {(member) => (
            <li>
              {/* A guardian's own list isn't shown in this group, so there's nothing to open. */}
              <Show
                when={member.role !== "guardian"}
                fallback={
                  <div class="list-row">
                    <span class="muted">
                      {member.profiles.display_name}
                      {member.profile_id === props.myProfileId ? t("common.you") : ""}
                    </span>
                    <span class="chip">{t("groupCard.guardian")}</span>
                  </div>
                }
              >
                <A class="list-row" href={`/lists/${member.profile_id}`}>
                  <span>
                    {member.profiles.display_name}
                    {member.profile_id === props.myProfileId ? t("common.you") : ""}
                  </span>
                  <Show when={!member.profiles.account_id}>
                    <span class="chip">{t("groupCard.child")}</span>
                  </Show>
                </A>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
