import { useNavigate } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { GroupCard } from "../components/GroupCard.tsx";
import { createGroup, getMyGroups } from "../lib/api/groups.ts";
import { getUpcomingOccasions } from "../lib/api/occasions.ts";
import { compareNames, t } from "../lib/i18n.ts";
import { useMe } from "../lib/me.tsx";
import { isLoaded } from "../lib/resource.ts";
import { nextOccasionPerGroup, today } from "../lib/occasions.ts";

export default function Home() {
  const me = useMe();
  const navigate = useNavigate();
  const [groups] = createResource(getMyGroups);
  const day = today();
  // Occasions are a nice extra here: if they fail to load, the groups still show.
  const [occasions] = createResource(() => getUpcomingOccasions(day).catch(() => []));
  const nextOccasions = createMemo(() =>
    nextOccasionPerGroup(occasions() ?? [], day, compareNames),
  );
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
      <h1>{t("home.title")}</h1>
      <Show when={groups.error}>
        <p class="error">{t("home.loadFailed", { message: groups.error.message })}</p>
      </Show>
      <Show when={!isLoaded(groups) && !groups.error}>
        <p class="muted">{t("common.loading")}</p>
      </Show>
      <Show when={groups()?.length === 0}>
        <p class="muted">{t("home.empty")}</p>
      </Show>
      <For each={groups()}>
        {(group) => (
          <GroupCard
            group={group}
            myProfileId={me().profile.id}
            nextOccasion={nextOccasions().get(group.id)}
            today={day}
          />
        )}
      </For>
      <form class="card" onSubmit={onCreate}>
        <label>
          {t("home.newGroup")}
          <input
            required
            placeholder={t("home.newGroupPlaceholder")}
            value={newName()}
            onInput={(e) => setNewName(e.currentTarget.value)}
          />
        </label>
        <button type="submit">{t("home.create")}</button>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
      </form>
    </>
  );
}
