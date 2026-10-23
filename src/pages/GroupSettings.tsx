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
import { t } from "../lib/i18n.ts";
import type { GroupId } from "../lib/ids.ts";
import { today } from "../lib/occasions.ts";
import { isReady } from "../lib/resource.ts";
import u from "../utilities.module.css";

export default function GroupSettings() {
  const params = useParams<{ groupId: GroupId }>();
  const runner = createActionRunner();
  const data = createGroupData(() => params.groupId);
  const occasions = createGroupOccasions(() => params.groupId, runner);
  const onRemove = createMemberRemoval(data, runner);
  const { group } = data;

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
        <p class={u.error}>{t("group.unavailable")}</p>
      </Show>
      <Show when={runner.notice()}>
        <p class={u.notice}>{runner.notice()}</p>
      </Show>
      <Show when={runner.error()}>
        <p class={u.error}>{runner.error()}</p>
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
          />
        </Show>

        <Show when={data.myMembership()}>
          {(mine) => <LeaveGroup data={data} runner={runner} mine={mine()} onRemove={onRemove} />}
        </Show>
      </Show>
    </>
  );
}
