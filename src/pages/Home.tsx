import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { GroupCard } from "../components/GroupCard.tsx";
import { createGroup, getMyGroups } from "../lib/api/groups.ts";
import { useMe } from "../lib/me.tsx";

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

  return (
    <>
      <h1>My groups</h1>
      <Show when={groups.error}>
        <p class="error">Couldn't load your groups: {groups.error.message}</p>
      </Show>
      <Show when={groups()?.length === 0}>
        <p class="muted">
          You're not in a group yet. Create one below, or ask someone for an invite link.
        </p>
      </Show>
      <For each={groups()}>
        {(group) => <GroupCard group={group} myProfileId={me().profile.id} />}
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
