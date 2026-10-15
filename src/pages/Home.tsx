import { A, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { createGroup, getMyGroups, type Group } from "../lib/api/groups.ts";
import { useMe } from "../lib/me.tsx";

function sortMembers(group: Group) {
  return [...group.group_members].sort((a, b) =>
    a.profiles.display_name.localeCompare(b.profiles.display_name),
  );
}

export default function Home() {
  const me = useMe();
  const navigate = useNavigate();
  const [groups] = createResource(getMyGroups);
  const [newName, setNewName] = createSignal("");
  const [error, setError] = createSignal<string>();

  async function onCreate(event: SubmitEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const id = await createGroup(newName());
      navigate(`/groups/${id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const isManager = (group: Group) =>
    group.group_members.some((m) => m.profile_id === me().profile.id && m.role === "manager");

  return (
    <>
      <h1>My groups</h1>
      <Show when={groups.error}>
        <p class="error">Couldn't load your groups: {groups.error.message}</p>
      </Show>
      <Show when={groups()?.length === 0}>
        <p class="muted">
          You're not in a group yet. Create one below, or ask someone to invite your email address.
        </p>
      </Show>
      <For each={groups()}>
        {(group) => (
          <section class="card">
            <div class="row">
              <h2>{group.name}</h2>
              <A class="link" href={`/groups/${group.id}`}>
                {isManager(group) ? "Manage" : "Details"}
              </A>
            </div>
            <ul class="list">
              <For each={sortMembers(group)}>
                {(member) => (
                  <li>
                    <A class="list-row" href={`/lists/${member.profile_id}`}>
                      <span>
                        {member.profiles.display_name}
                        {member.profile_id === me().profile.id ? " (you)" : ""}
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
        )}
      </For>
      <form class="card" onSubmit={onCreate}>
        <label>
          New group
          <input
            required
            placeholder="e.g. Family"
            value={newName()}
            onInput={(e) => setNewName(e.currentTarget.value)}
          />
        </label>
        <button type="submit">Create group</button>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
      </form>
    </>
  );
}
