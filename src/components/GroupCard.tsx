import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { Group } from "../lib/api/groups.ts";

export type GroupCardProps = {
  group: Group;
  /** Your own profile id, to mark "(you)" and pick Manage or Details. */
  myProfileId: string;
};

/** A group on the home page: its name and a link to each member's list. */
export function GroupCard(props: GroupCardProps) {
  const members = () =>
    [...props.group.group_members].sort((a, b) =>
      a.profiles.display_name.localeCompare(b.profiles.display_name),
    );
  const isManager = () =>
    props.group.group_members.some(
      (m) => m.profile_id === props.myProfileId && m.role === "manager",
    );

  return (
    <section class="card">
      <div class="row">
        <h2>{props.group.name}</h2>
        <A class="link" href={`/groups/${props.group.id}`}>
          {isManager() ? "Manage" : "Details"}
        </A>
      </div>
      <ul class="list">
        <For each={members()}>
          {(member) => (
            <li>
              <A class="list-row" href={`/lists/${member.profile_id}`}>
                <span>
                  {member.profiles.display_name}
                  {member.profile_id === props.myProfileId ? " (you)" : ""}
                </span>
                <Show when={!member.profiles.account_id}>
                  <span class="chip">child</span>
                </Show>
              </A>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
