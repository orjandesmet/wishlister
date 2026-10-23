import { useNavigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { focusSoon } from "../lib/a11y.ts";
import { deleteGroup, setMemberRole, type Member } from "../lib/api/groups.ts";
import type { ActionRunner } from "../lib/createActionRunner.ts";
import type { GroupData } from "../lib/createGroupData.ts";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { useMe } from "../lib/me.tsx";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
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

  // Asking for a successor swaps the Leave button for a form, so focus follows, and back.
  // oxlint-disable-next-line no-unassigned-vars
  let box: HTMLDivElement | undefined;
  const onLeave = () => {
    if (!mustHandOver()) return void props.onRemove(props.mine);
    setHandingOver(true);
    focusSoon(() => box?.querySelector("select"));
  };
  const onStay = () => {
    setHandingOver(false);
    focusSoon(() => box?.querySelector("button"));
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
    <div ref={box} class={u.stack}>
      <Show
        when={handingOver()}
        fallback={
          <Button variant="secondary" onClick={onLeave}>
            {t("group.leave")}
          </Button>
        }
      >
        <Card as="div">
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
          <Button variant="secondary" onClick={onStay}>
            {t("group.stay")}
          </Button>
        </Card>
      </Show>
      <Show when={data.isManager()}>
        <Button variant="secondary" danger onClick={onDeleteGroup}>
          {t("group.deleteGroup")}
        </Button>
      </Show>
    </div>
  );
}
