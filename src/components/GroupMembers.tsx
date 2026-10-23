import { For, Match, Show, Switch } from "solid-js";
import { setMemberRole, type Member } from "../lib/api/groups.ts";
import type { ActionRunner } from "../lib/createActionRunner.ts";
import type { GroupData } from "../lib/createGroupData.ts";
import { createGroupInvites } from "../lib/createGroupInvites.ts";
import { t } from "../lib/i18n.ts";
import { useMe } from "../lib/me.tsx";
import { Avatar } from "./Avatar.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import { Select } from "./Select.tsx";

/** The group's adults with their roles, plus pending invites and ways to invite more. */
export function GroupMembers(props: {
  data: GroupData;
  runner: ActionRunner;
  onRemove: (member: Member) => void;
}) {
  const me = useMe();
  const { data } = props;
  const invites = createGroupInvites(data, props.runner);

  const onRole = (member: Member, role: Member["role"]) =>
    props.runner.run(async () => {
      await setMemberRole(data.groupId(), member.profile_id, role);
      await data.refetchGroup();
    });

  return (
    <section class="card">
      <h2>{t("group.members")}</h2>
      <ul class="list">
        <For each={data.adults()}>
          {(member) => (
            <li class="list-row member-row">
              <span class="person">
                <Avatar id={member.profile_id} name={member.profiles.display_name} />
                {member.profiles.display_name}
                {member.profile_id === me().profile.id ? t("common.you") : ""}
              </span>
              <Switch fallback={<span class="chip">{t(`roles.${member.role}`)}</span>}>
                <Match when={data.isManager() && member.profile_id !== me().profile.id}>
                  <span class="row">
                    <Select
                      value={member.role}
                      onChange={(e) => onRole(member, e.currentTarget.value as Member["role"])}
                    >
                      <option value="member">{t("roles.member")}</option>
                      <option value="guardian">{t("roles.guardian")}</option>
                      <option value="manager">{t("roles.manager")}</option>
                    </Select>
                    <button
                      type="button"
                      class="link danger"
                      onClick={() => props.onRemove(member)}
                    >
                      <RemoveLabel />
                    </button>
                  </span>
                </Match>
                {/* Members choose for themselves whether their own list shows in this group. */}
                <Match when={member.profile_id === me().profile.id && member.role !== "manager"}>
                  <Select
                    value={member.role}
                    onChange={(e) => onRole(member, e.currentTarget.value as Member["role"])}
                  >
                    <option value="member">{t("roles.member")}</option>
                    <option value="guardian">{t("roles.guardian")}</option>
                  </Select>
                </Match>
              </Switch>
            </li>
          )}
        </For>
      </ul>
      <Show when={data.adults().some((m) => m.role === "guardian") || !data.isManager()}>
        <p class="muted small">{t("group.guardianHelp")}</p>
      </Show>
      <Show when={data.isManager() && (data.invites()?.length ?? 0) > 0}>
        <h3>{t("group.pendingInvites")}</h3>
        <ul class="list">
          <For each={data.invites()}>
            {(email) => (
              <li class="list-row">
                <span class="muted truncate">{email}</span>
                <span class="row">
                  <button type="button" class="link" onClick={() => invites.onEmailInvite(email)}>
                    {t("group.emailInvite")}
                  </button>
                  <button
                    type="button"
                    class="link danger"
                    onClick={() => invites.onCancelInvite(email)}
                  >
                    {t("common.cancel")}
                  </button>
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={data.isManager()}>
        <form onSubmit={invites.onInvite}>
          <label>
            {t("group.inviteByEmail")}
            <input
              type="email"
              required
              value={invites.inviteEmail()}
              onInput={(e) => invites.setInviteEmail(e.currentTarget.value)}
            />
          </label>
          <button type="submit">{t("group.invite")}</button>
        </form>
        <button
          type="button"
          class="secondary invite-link-button"
          popovertarget="invite-link-popover"
        >
          {t("group.inviteLink")}
        </button>
        <div id="invite-link-popover" class="popover sheet-popover invite-popover" popover>
          <h3>{t("group.inviteLink")}</h3>
          <p class="muted small">{t("group.inviteLinkHelp")}</p>
          <div class="row button-row">
            <button type="button" onClick={invites.onShareLink}>
              {t("group.shareLink")}
            </button>
            <button type="button" class="secondary" onClick={invites.onResetLink}>
              {t("group.newLink")}
            </button>
          </div>
        </div>
      </Show>
    </section>
  );
}
