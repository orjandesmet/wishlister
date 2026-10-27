import { A } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import { GroupCard } from "../components/GroupCard.tsx";
import { LinkButton } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { NewGroupForm } from "../components/NewGroupForm.tsx";
import { Popover } from "../components/Popover.tsx";
import { createCachedResource } from "../lib/cache.ts";
import { useCreateGroupAndOpen } from "../lib/createGroupAndOpen.ts";
import { compareNames, t } from "../lib/i18n.ts";
import type { GroupId, OccasionId } from "../lib/ids.ts";
import { useMe } from "../lib/me.tsx";
import { isReady } from "../lib/resource.ts";
import {
  loadDrawnPeople,
  loadMyGroups,
  loadSecretSantaOccasionIds,
  loadUpcomingOccasions,
} from "../lib/loaders.ts";
import { nextOccasionPerGroup, today } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import styles from "./Home.module.css";
import { usePageTitle } from "../lib/a11y.ts";

export default function Home() {
  const me = useMe();
  const onCreate = useCreateGroupAndOpen();
  // Both show what they loaded last time at once, while they load again.
  const [groups] = createCachedResource(() => true, loadMyGroups);
  const day = today();
  // Occasions are a nice extra here: if they fail to load, the groups still show.
  const [occasions] = createCachedResource(() => day, loadUpcomingOccasions);
  const nextOccasions = createMemo(() =>
    nextOccasionPerGroup(occasions() ?? [], day, compareNames),
  );
  // Another extra: which of those occasions have a Secret Santa, and who you drew. If they fail
  // to load, the cards just don't mention it.
  const [secretSantas] = createCachedResource(() => true, loadSecretSantaOccasionIds);
  const [drawnPeople] = createCachedResource(() => true, loadDrawnPeople);
  /** The occasion of the group's running Secret Santa: an upcoming one that has a draw. */
  const secretSantaOf = (groupId: GroupId) =>
    secretSantas.error
      ? undefined
      : (occasions() ?? []).find(
          (o) => o.group_id === groupId && (secretSantas() ?? []).some((id) => id === o.id),
        );
  const drawnFor = (occasionId?: OccasionId) =>
    drawnPeople.error || !occasionId
      ? undefined
      : (drawnPeople() ?? []).find((d) => d.occasion_id === occasionId)?.recipient_profile_id;
  // Reading a failed resource throws, so go through here: the error message is shown instead.
  const loadedGroups = () => (groups.error ? [] : groups());
  const hasGroups = () => (loadedGroups()?.length ?? 0) > 0;

  usePageTitle(() => t("home.title"));

  return (
    <>
      <div class={u.row}>
        <h1>{t("home.title")}</h1>
        {/* Phones open a page for the form, wide screens a popover; CSS shows one of the two. */}
        <Show when={hasGroups()}>
          <A class={styles.addLink} href="/groups/new" aria-label={t("home.addGroup")}>
            +
          </A>
          <button type="button" class={styles.addButton} popovertarget="new-group-popover">
            {t("home.addGroup")}
          </button>
          <Popover id="new-group-popover" anchor="--add-group">
            <NewGroupForm onCreate={onCreate} />
          </Popover>
        </Show>
      </div>
      <Show when={groups.error}>
        <p class={u.error} role="alert">
          {t("home.loadFailed", { message: groups.error.message })}
        </p>
      </Show>
      <Show when={!isReady(groups) && !groups.error}>
        <p class={u.muted}>{t("common.loading")}</p>
      </Show>
      <Show when={isReady(groups) && loadedGroups()?.length === 0}>
        <EmptyState>
          <p class={u.muted}>{t("home.empty")}</p>
          <LinkButton href="/groups/new">{t("home.addGroup")}</LinkButton>
        </EmptyState>
      </Show>
      <For each={loadedGroups()}>
        {(group) => (
          <GroupCard
            group={group}
            myProfileId={me().profile.id}
            nextOccasion={nextOccasions().get(group.id)}
            secretSanta={secretSantaOf(group.id)}
            drawnProfileId={drawnFor(secretSantaOf(group.id)?.id)}
            today={day}
          />
        )}
      </For>
    </>
  );
}
