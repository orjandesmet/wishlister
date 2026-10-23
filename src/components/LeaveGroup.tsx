import { useNavigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { deleteGroup, setMemberRole, type Member } from "../lib/api/groups.ts";
import type { ActionRunner } from "../lib/createActionRunner.ts";
import type { GroupData } from "../lib/createGroupData.ts";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { useMe } from "../lib/me.tsx";
import { Select } from "./Select.tsx";

/** Leaving the group (handing it over first when needed) and, for managers, deleting it. */
export function LeaveGroup(props: {
  data: GroupData;
  runner: ActionRunner;
  mine: Member;
  onRemove: (member: Member) => Promise<unknown>;
}) {
  const me = useMe();
  const navigate = useNavigate();
  const { data } = props;

  // The last manager picks a successor before leaving, unless they're the last adult.
  const otherAdultsInGroup = () => data.adults().filter((a) => a.profile_id !== me().profile.id);
  const mustHandOver = () =>
    data.isManager() &&
    !otherAdultsInGroup().some((a) => a.role === "manager") &&
    otherAdultsInGroup().length > 0;
  const [handingOver, setHandingOver] = createSignal(false);
  const [successor, setSuccessor] = createSignal<ProfileId>();

  const onLeave = () => {
    if (mustHandOver()) setHandingOver(true);
    else void props.onRemove(props.mine);
  };

  const onHandOverAndLeave = () =>
    props.runner.run(async () => {
      const next = otherAdultsInGroup().find((a) => a.profile_id === successor());
      if (!next) return;
      await setMemberRole(data.groupId(), next.profile_id, "manager");
      await data.refetchGroup();
      setHandingOver(false);
      await props.onRemove(props.mine);
    });

  const onDeleteGroup = () =>
    props.runner.run(async () => {
      if (!confirm(t("group.confirmDeleteGroup", { group: data.group()!.name }))) return;
      await deleteGroup(data.groupId());
      navigate("/", { replace: true });
    });

  return (
    <div class="stack">
      <Show
        when={handingOver()}
        fallback={
          <button type="button" class="secondary" onClick={onLeave}>
            {t("group.leave")}
          </button>
        }
      >
        <div class="card">
          <label>
            {t("group.chooseSuccessor", { group: data.group()?.name ?? "" })}
            <Select
              value={successor() ?? ""}
              onChange={(e) => setSuccessor(e.currentTarget.value as ProfileId)}
            >
              <option value="" disabled>
                {t("group.chooseMember")}
              </option>
              <For each={otherAdultsInGroup()}>
                {(adult) => <option value={adult.profile_id}>{adult.profiles.display_name}</option>}
              </For>
            </Select>
          </label>
          <button type="button" disabled={!successor()} onClick={onHandOverAndLeave}>
            {t("group.handOverAndLeave")}
          </button>
          <button type="button" class="secondary" onClick={() => setHandingOver(false)}>
            {t("group.stay")}
          </button>
        </div>
      </Show>
      <Show when={data.isManager()}>
        <button type="button" class="secondary danger" onClick={onDeleteGroup}>
          {t("group.deleteGroup")}
        </button>
      </Show>
    </div>
  );
}
