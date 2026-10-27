import { A, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { GroupChildren } from "../components/GroupChildren.tsx";
import { GroupMembers } from "../components/GroupMembers.tsx";
import { LeaveGroup } from "../components/LeaveGroup.tsx";
import { Occasions } from "../components/Occasions.tsx";
import { RenameGroup } from "../components/RenameGroup.tsx";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { createGroupData } from "../lib/createGroupData.ts";
import { createGroupOccasions } from "../lib/createGroupOccasions.ts";
import { createMemberRemoval } from "../lib/createMemberRemoval.ts";
import { createSecretSanta } from "../lib/createSecretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId } from "../lib/ids.ts";
import { today } from "../lib/occasions.ts";
import { isReady } from "../lib/resource.ts";
import u from "../utilities.module.css";
import { usePageTitle } from "../lib/a11y.ts";

export default function GroupSettings() {
  const params = useParams<{ groupId: GroupId }>();
  const runner = createActionRunner();
  const data = createGroupData(() => params.groupId);
  const occasions = createGroupOccasions(() => params.groupId, runner);
  const santa = createSecretSanta(() => params.groupId, data, occasions.occasions, runner);
  const onRemove = createMemberRemoval(data, runner, santa.drawsTakingPart);
  const { group } = data;

  usePageTitle(() => group()?.name ?? t("group.fallbackTitle"));

  return (
    <>
      <A class={u.link} href="/">
        {t("group.back")}
      </A>
      <div class={u.row}>
        <h1>{group()?.name ?? t("group.fallbackTitle")}</h1>
        <Show when={isReady(group) && data.isManager()}>
          <RenameGroup data={data} runner={runner} />
        </Show>
      </div>
      <Show when={group.error}>
        <p class={u.error} role="alert">
          {t("group.unavailable")}
        </p>
      </Show>
      {/* Always there, so screen readers notice when a message appears in it. */}
      <div role="status">
        <Show when={runner.notice()}>
          <p class={u.notice}>{runner.notice()}</p>
        </Show>
      </div>
      <Show when={runner.error()}>
        <p class={u.error} role="alert">
          {runner.error()}
        </p>
      </Show>
      <Show when={!isReady(group) && !group.error}>
        <p class={u.muted}>{t("common.loading")}</p>
      </Show>

      {/* Roles decide most of what shows here, so nothing renders before the group has loaded. */}
      <Show when={isReady(group)}>
        <GroupMembers data={data} runner={runner} onRemove={onRemove} />
        <GroupChildren data={data} runner={runner} onRemove={onRemove} />

        <Show when={isReady(occasions.occasions)}>
          <Occasions
            occasions={occasions.occasions() ?? []}
            today={today()}
            canEdit={data.isManager()}
            onAdd={occasions.onAdd}
            onUpdate={occasions.onUpdate}
            onDelete={occasions.onDelete}
            secretSanta={
              isReady(santa.draws) && !santa.draws.error
                ? {
                    draws: santa.draws() ?? [],
                    isManager: data.isManager(),
                    candidates: santa.candidates() ?? [],
                    participants: santa.participants() ?? new Map(),
                    busy: santa.busy(),
                    error: santa.startError(),
                    onClearError: santa.clearStartError,
                    onStart: santa.onStart,
                    onRemove: santa.onRemove,
                  }
                : undefined
            }
          />
        </Show>

        <Show when={data.myMembership()}>
          {(mine) => <LeaveGroup data={data} runner={runner} mine={mine()} onRemove={onRemove} />}
        </Show>
      </Show>
    </>
  );
}
