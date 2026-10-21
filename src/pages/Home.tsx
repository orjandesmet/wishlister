import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { GroupCard } from "../components/GroupCard.tsx";
import { usePageTitle } from "../lib/a11y.ts";
import { createGroup, getMyGroups } from "../lib/api/groups.ts";
import { t } from "../lib/i18n.ts";
import { useMe } from "../lib/me.tsx";

export default function Home() {
  const me = useMe();
  const navigate = useNavigate();
  const [groups] = createResource(getMyGroups);
  const [newName, setNewName] = createSignal("");
  const [error, setError] = createSignal<string>();
  usePageTitle(() => t("home.title"));

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
        <p class="error" role="alert">
          {t("home.loadFailed", { message: groups.error.message })}
        </p>
      </Show>
      <Show when={groups()?.length === 0}>
        <p class="muted">{t("home.empty")}</p>
      </Show>
      <For each={groups()}>
        {(group) => <GroupCard group={group} myProfileId={me().profile.id} />}
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
          <p class="error" role="alert">
            {error()}
          </p>
        </Show>
      </form>
    </>
  );
}
