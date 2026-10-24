import { For, Match, Show, Switch } from "solid-js";
import { setMemberRole, type Member } from "../lib/api/groups.ts";
import type { ActionRunner } from "../lib/createActionRunner.ts";
import type { GroupData } from "../lib/createGroupData.ts";
import { createGroupInvites } from "../lib/createGroupInvites.ts";
import { isDemo } from "../lib/demo.ts";
import { t } from "../lib/i18n.ts";
import { useMe } from "../lib/me.tsx";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { Chip } from "./Chip.tsx";
import { Person } from "./Person.tsx";
import { Popover } from "./Popover.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import { Select } from "./Select.tsx";
import styles from "./GroupMembers.module.css";

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
    <Card>
      <h2>{t("group.members")}</h2>
      <ul class={u.list}>
        <For each={data.adults()}>
          {(member) => (
            <li class={`${u.listRow} ${styles.memberRow}`}>
              <Person
                id={member.profile_id}
                name={member.profiles.display_name}
                class={styles.person}
              >
                {member.profiles.display_name}
                {member.profile_id === me().profile.id ? t("common.you") : ""}
              </Person>
              <Switch fallback={<Chip>{t(`roles.${member.role}`)}</Chip>}>
                <Match when={data.isManager() && member.profile_id !== me().profile.id}>
                  <span class={u.row}>
                    <Select
                      aria-label={t("a11y.roleOf", { name: member.profiles.display_name })}
                      value={member.role}
                      onChange={(e) => onRole(member, e.currentTarget.value as Member["role"])}
                    >
                      <option value="member">{t("roles.member")}</option>
                      <option value="guardian">{t("roles.guardian")}</option>
                      <option value="manager">{t("roles.manager")}</option>
                    </Select>
                    <Button variant="link" danger onClick={() => props.onRemove(member)}>
                      <RemoveLabel of={member.profiles.display_name} />
                    </Button>
                  </span>
                </Match>
                {/* Members choose for themselves whether their own list shows in this group. */}
                <Match when={member.profile_id === me().profile.id && member.role !== "manager"}>
                  <Select
                    aria-label={t("a11y.roleOf", { name: member.profiles.display_name })}
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
        <p class={`${u.muted} ${u.small}`}>{t("group.guardianHelp")}</p>
      </Show>
      <Show when={data.isManager() && (data.invites()?.length ?? 0) > 0}>
        <h3>{t("group.pendingInvites")}</h3>
        <ul class={u.list}>
          <For each={data.invites()}>
            {(email) => (
              <li class={u.listRow}>
                <span class={`${u.muted} ${u.truncate}`}>{email}</span>
                <span class={u.row}>
                  <Button variant="link" onClick={() => invites.onEmailInvite(email)}>
                    {t("group.emailInvite")}
                    <span class={u.visuallyHidden}> {email}</span>
                  </Button>
                  <Button variant="link" danger onClick={() => invites.onCancelInvite(email)}>
                    {t("common.cancel")}
                    <span class={u.visuallyHidden}> {email}</span>
                  </Button>
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={data.isManager()}>
        {/* The demo sends no email: its accounts are made up. */}
        <Show when={!isDemo}>
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
        </Show>
        <Button
          variant="secondary"
          class={styles.inviteLinkButton}
          popovertarget="invite-link-popover"
        >
          {t("group.inviteLink")}
        </Button>
        <Popover id="invite-link-popover" anchor="--invite-link" area="bottom span-right" sheet>
          <h3>{t("group.inviteLink")}</h3>
          <p class={`${u.muted} ${u.small}`}>{t("group.inviteLinkHelp")}</p>
          <div class={`${u.row} ${styles.buttonRow}`}>
            <button type="button" onClick={invites.onShareLink}>
              {t("group.shareLink")}
            </button>
            <Button variant="secondary" onClick={invites.onResetLink}>
              {t("group.newLink")}
            </Button>
          </div>
        </Popover>
      </Show>
    </Card>
  );
}
