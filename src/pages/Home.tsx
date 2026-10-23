import { A } from "@solidjs/router";
import { createMemo, createResource, For, Show } from "solid-js";
import { GroupCard } from "../components/GroupCard.tsx";
import { NewGroupForm } from "../components/NewGroupForm.tsx";
import { getMyGroups } from "../lib/api/groups.ts";
import { getUpcomingOccasions } from "../lib/api/occasions.ts";
import { useCreateGroupAndOpen } from "../lib/createGroupAndOpen.ts";
import { compareNames, t } from "../lib/i18n.ts";
import { useMe } from "../lib/me.tsx";
import { isReady } from "../lib/resource.ts";
import { nextOccasionPerGroup, today } from "../lib/occasions.ts";

export default function Home() {
  const me = useMe();
  const onCreate = useCreateGroupAndOpen();
  const [groups] = createResource(getMyGroups);
  const day = today();
  // Occasions are a nice extra here: if they fail to load, the groups still show.
  const [occasions] = createResource(() => getUpcomingOccasions(day).catch(() => []));
  const nextOccasions = createMemo(() =>
    nextOccasionPerGroup(occasions() ?? [], day, compareNames),
  );
  const hasGroups = () => (groups()?.length ?? 0) > 0;

  return (
    <>
      <div class="row">
        <h1>{t("home.title")}</h1>
        {/* Phones open a page for the form, wide screens a popover; CSS shows one of the two. */}
        <Show when={hasGroups()}>
          <A class="add-link" href="/groups/new" aria-label={t("home.addGroup")}>
            +
          </A>
          <button type="button" class="add-popover-button" popovertarget="new-group-popover">
            {t("home.addGroup")}
          </button>
          <div id="new-group-popover" class="popover" popover>
            <NewGroupForm onCreate={onCreate} />
          </div>
        </Show>
      </div>
      <Show when={groups.error}>
        <p class="error">{t("home.loadFailed", { message: groups.error.message })}</p>
      </Show>
      <Show when={!isReady(groups) && !groups.error}>
        <p class="muted">{t("common.loading")}</p>
      </Show>
      <Show when={isReady(groups) && groups()?.length === 0}>
        <div class="empty-state">
          <p class="muted">{t("home.empty")}</p>
          <A class="button" href="/groups/new">
            {t("home.addGroup")}
          </A>
        </div>
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
    </>
  );
}
