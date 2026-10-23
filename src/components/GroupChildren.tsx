import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { addChild, addChildToGroup } from "../lib/api/children.ts";
import type { Member } from "../lib/api/groups.ts";
import type { ActionRunner } from "../lib/createActionRunner.ts";
import type { GroupData } from "../lib/createGroupData.ts";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { useMe } from "../lib/me.tsx";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { EditLabel } from "./EditLabel.tsx";
import { ParentSelect } from "./ParentSelect.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import { Select } from "./Select.tsx";
import styles from "./GroupChildren.module.css";

/** The group's children, with ways to add your own or create a new one. */
export function GroupChildren(props: {
  data: GroupData;
  runner: ActionRunner;
  onRemove: (member: Member) => void;
}) {
  const me = useMe();
  const { data } = props;
  const [childName, setChildName] = createSignal("");
  const [childParent, setChildParent] = createSignal<ProfileId>();

  // My children who aren't in this group yet.
  const myOtherChildren = () =>
    (me().managed() ?? []).filter((c) => !data.children().some((m) => m.profile_id === c.id));

  const onAddChild = (event: SubmitEvent) => {
    event.preventDefault();
    // Read the parent from the form: it's exactly what the select shows.
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const parent = (form.get("parent") as ProfileId | null) ?? me().profile.id;
    void props.runner.run(async () => {
      await addChild(data.groupId(), childName(), parent);
      props.runner.setNotice(
        parent === me().profile.id
          ? t("group.childAddedByMe", { child: childName() })
          : t("group.childAdded", { child: childName(), parent: data.nameOf(parent) }),
      );
      setChildName("");
      setChildParent(undefined);
      await Promise.all([data.refetchGroup(), data.refetchParents()]);
      me().refetchManaged();
    });
  };

  const onAddMyChild = (childProfileId: ProfileId) =>
    props.runner.run(async () => {
      if (!childProfileId) return;
      await addChildToGroup(data.groupId(), childProfileId);
      await data.refetchGroup();
    });

  return (
    <Card>
      <h2>{t("group.children")}</h2>
      <p class={`${u.muted} ${u.small}`}>{t("group.childrenHelp")}</p>
      <ul class={u.list}>
        <For each={data.children()} fallback={<li class={u.muted}>{t("group.noChildren")}</li>}>
          {(child) => {
            const iAmParent = () =>
              data.parents()?.get(child.profile_id)?.includes(me().profile.id);
            return (
              <li class={styles.child}>
                <div class={u.listRow}>
                  <span>{child.profiles.display_name}</span>
                  <span class={u.row}>
                    <Show when={iAmParent()}>
                      <A class={u.link} href={`/children/${child.profile_id}`}>
                        <EditLabel
                          label={t("child.editProfile")}
                          of={child.profiles.display_name}
                        />
                      </A>
                    </Show>
                    <Show when={data.isManager() || iAmParent()}>
                      <Button variant="link" danger onClick={() => props.onRemove(child)}>
                        <RemoveLabel of={child.profiles.display_name} />
                      </Button>
                    </Show>
                  </span>
                </div>
              </li>
            );
          }}
        </For>
      </ul>
      <Show when={myOtherChildren().length > 0}>
        <Select
          aria-label={t("group.addMyChild")}
          onChange={(e) => onAddMyChild(e.currentTarget.value as ProfileId)}
        >
          <option value="">{t("group.addMyChild")}</option>
          <For each={myOtherChildren()}>
            {(child) => <option value={child.id}>{child.display_name}</option>}
          </For>
        </Select>
      </Show>
      <Show when={data.isManager()}>
        <form onSubmit={onAddChild}>
          <label>
            {t("group.addNewChild")}
            <input
              required
              placeholder={t("group.childName")}
              value={childName()}
              onInput={(e) => setChildName(e.currentTarget.value)}
            />
          </label>
          <label>
            {t("group.parent")}
            <ParentSelect
              name="parent"
              options={data.adults().map((adult) => ({
                id: adult.profile_id,
                name:
                  adult.profiles.display_name +
                  (adult.profile_id === me().profile.id ? t("common.you") : ""),
              }))}
              value={childParent() ?? me().profile.id}
              onChange={setChildParent}
            />
          </label>
          <button type="submit">{t("group.addChild")}</button>
        </form>
      </Show>
    </Card>
  );
}
