import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Match, Show, Switch } from "solid-js";
import {
  addChild,
  addChildToGroup,
  addParent,
  deleteChild,
  getParents,
  removeParent,
} from "../lib/api/children.ts";
import {
  cancelInvite,
  deleteGroup,
  getGroup,
  getInvites,
  getJoinLink,
  inviteToGroup,
  removeMember,
  renameGroup,
  resetJoinLink,
  sendInviteEmail,
  setMemberRole,
  type InviteResult,
  type Member,
} from "../lib/api/groups.ts";
import { compareNames, formatList, t } from "../lib/i18n.ts";
import type { GroupId, ProfileId } from "../lib/ids.ts";
import { useMe } from "../lib/me.tsx";

export default function GroupSettings() {
  const params = useParams<{ groupId: GroupId }>();
  const navigate = useNavigate();
  const me = useMe();

  const [group, { refetch: refetchGroup }] = createResource(() => params.groupId, getGroup);
  const members = createMemo(() =>
    [...(group()?.group_members ?? [])].sort((a, b) =>
      compareNames(a.profiles.display_name, b.profiles.display_name),
    ),
  );
  const adults = () => members().filter((m) => m.profiles.account_id);
  const children = () => members().filter((m) => !m.profiles.account_id);
  const isManager = () =>
    members().some((m) => m.profile_id === me().profile.id && m.role === "manager");

  const [invites, { refetch: refetchInvites }] = createResource(
    () => (isManager() ? params.groupId : undefined),
    getInvites,
  );
  const [parents, { refetch: refetchParents }] = createResource(
    () => children().map((c) => c.profile_id),
    getParents,
  );
  const nameOf = (profileId: ProfileId) =>
    members().find((m) => m.profile_id === profileId)?.profiles.display_name ?? t("common.someone");
  // My children who aren't in this group yet.
  const myOtherChildren = () =>
    (me().managed() ?? []).filter((c) => !children().some((m) => m.profile_id === c.id));

  const [groupName, setGroupName] = createSignal<string>();
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [childName, setChildName] = createSignal("");
  const [childParent, setChildParent] = createSignal<ProfileId>();
  const [notice, setNotice] = createSignal<string>();
  const [error, setError] = createSignal<string>();

  async function run(action: () => Promise<unknown>) {
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const onRename = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      await renameGroup(params.groupId, groupName() ?? group()!.name);
      await refetchGroup();
      setNotice(t("group.renamed"));
    });
  };

  const onInvite = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await inviteToGroup(params.groupId, inviteEmail());
      const email = inviteEmail().trim();
      setInviteEmail("");
      if (result === "invited") {
        // No account yet: email them. The invite is saved either way, so if the
        // email fails they still join on first sign-in and can be emailed again.
        await emailInvite(email);
        return;
      }
      const notices: Record<Exclude<InviteResult, "invited">, string> = {
        added: t("group.added", { email }),
        already_invited: t("group.alreadyInvited", { email }),
        already_member: t("group.alreadyMember", { email }),
      };
      setNotice(notices[result]);
      await Promise.all([refetchGroup(), refetchInvites()]);
    });
  };

  /** Emails a pending invite and shows them as a member, since that creates their account. */
  async function emailInvite(email: string) {
    try {
      await sendInviteEmail(params.groupId, email);
      setNotice(t("group.inviteSent", { email }));
    } catch (e) {
      setError(t("group.inviteEmailFailed", { email, message: (e as Error).message }));
    } finally {
      await Promise.all([refetchGroup(), refetchInvites()]);
    }
  }

  /** Hands the link to the phone's share sheet, or copies it where there is none. */
  async function shareLink(link: string) {
    const name = group()!.name;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("group.shareTitle", { group: name }), url: link });
      } catch (e) {
        // Closing the share sheet isn't an error.
        if ((e as Error).name !== "AbortError") throw e;
      }
    } else {
      await navigator.clipboard.writeText(link);
      setNotice(t("group.linkCopied"));
    }
  }

  const onShareLink = () => run(async () => shareLink(await getJoinLink(params.groupId)));

  const onResetLink = () =>
    run(async () => {
      if (!confirm(t("group.confirmNewLink"))) return;
      await resetJoinLink(params.groupId);
      setNotice(t("group.newLinkMade"));
    });

  const onAddChild = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      const parent = childParent() ?? me().profile.id;
      await addChild(params.groupId, childName(), parent);
      setNotice(
        parent === me().profile.id
          ? t("group.childAddedByMe", { child: childName() })
          : t("group.childAdded", { child: childName(), parent: nameOf(parent) }),
      );
      setChildName("");
      setChildParent(undefined);
      await Promise.all([refetchGroup(), refetchParents()]);
      me().refetchManaged();
    });
  };

  const onAddMyChild = (childProfileId: ProfileId) =>
    run(async () => {
      if (!childProfileId) return;
      await addChildToGroup(params.groupId, childProfileId);
      await refetchGroup();
    });

  const onRole = (member: Member, role: Member["role"]) =>
    run(async () => {
      await setMemberRole(params.groupId, member.profile_id, role);
      await refetchGroup();
    });

  /** Children who'd have no parent left in this group once `adult` is gone. */
  const childrenLeftBehind = (adult: Member) =>
    children().filter((child) => {
      const childParents = parents()?.get(child.profile_id) ?? [];
      return !adults().some(
        (a) => a.profile_id !== adult.profile_id && childParents.includes(a.profile_id),
      );
    });

  const onRemove = (member: Member) =>
    run(async () => {
      const groupName = group()!.name;
      const leaving = member.profile_id === me().profile.id;
      const isAdult = !!member.profiles.account_id;
      const lines = [
        leaving
          ? t("group.confirmLeave", { group: groupName })
          : t("group.confirmRemove", { name: member.profiles.display_name, group: groupName }),
      ];
      if (isAdult) {
        const leftBehind = childrenLeftBehind(member).map((c) => c.profiles.display_name);
        if (leftBehind.length > 0) {
          lines.push(t("group.childrenLeftBehind", { names: formatList(leftBehind) }));
        }
        if (adults().length === 1) {
          lines.push(t("group.groupWillBeDeleted", { group: groupName }));
        }
      }
      if (!confirm(lines.join("\n\n"))) return;
      const result = await removeMember(params.groupId, member.profile_id);
      if (leaving || result === "group_deleted") navigate("/", { replace: true });
      else await Promise.all([refetchGroup(), refetchParents()]);
    });

  const onRemoveParent = (child: Member, parentProfileId: ProfileId) =>
    run(async () => {
      const childName = child.profiles.display_name;
      if (
        !confirm(
          t("group.confirmRemoveParent", { parent: nameOf(parentProfileId), child: childName }),
        )
      )
        return;
      await removeParent(child.profile_id, parentProfileId);
      await refetchParents();
      me().refetchManaged();
    });

  const onDeleteChild = (child: Member) =>
    run(async () => {
      const childName = child.profiles.display_name;
      if (!confirm(t("child.confirmDelete", { name: childName }))) return;
      await deleteChild(child.profile_id);
      await refetchGroup();
      me().refetchManaged();
    });

  const onAddParent = (child: Member, parentProfileId: ProfileId) =>
    run(async () => {
      if (!parentProfileId) return;
      await addParent(child.profile_id, parentProfileId);
      await refetchParents();
    });

  const onDeleteGroup = () =>
    run(async () => {
      if (!confirm(t("group.confirmDeleteGroup", { group: group()!.name }))) return;
      await deleteGroup(params.groupId);
      navigate("/", { replace: true });
    });

  const myMembership = () => members().find((m) => m.profile_id === me().profile.id);

  // The last manager picks a successor before leaving, unless they're the last adult.
  const otherAdultsInGroup = () => adults().filter((a) => a.profile_id !== me().profile.id);
  const mustHandOver = () =>
    isManager() &&
    !otherAdultsInGroup().some((a) => a.role === "manager") &&
    otherAdultsInGroup().length > 0;
  const [handingOver, setHandingOver] = createSignal(false);
  const [successor, setSuccessor] = createSignal<ProfileId>();

  const onLeave = (mine: Member) => {
    if (mustHandOver()) setHandingOver(true);
    else void onRemove(mine);
  };

  const onHandOverAndLeave = (mine: Member) =>
    run(async () => {
      const next = otherAdultsInGroup().find((a) => a.profile_id === successor());
      if (!next) return;
      await setMemberRole(params.groupId, next.profile_id, "manager");
      await refetchGroup();
      setHandingOver(false);
      await onRemove(mine);
    });

  return (
    <>
      <A class="link" href="/">
        {t("group.back")}
      </A>
      <h1>{group()?.name ?? t("group.fallbackTitle")}</h1>
      <Show when={group.error}>
        <p class="error">{t("group.unavailable")}</p>
      </Show>
      <Show when={notice()}>
        <p class="notice">{notice()}</p>
      </Show>
      <Show when={error()}>
        <p class="error">{error()}</p>
      </Show>

      <section class="card">
        <h2>{t("group.members")}</h2>
        <ul class="list">
          <For each={adults()}>
            {(member) => (
              <li class="list-row">
                <span>
                  {member.profiles.display_name}
                  {member.profile_id === me().profile.id ? t("common.you") : ""}
                </span>
                <Switch fallback={<span class="chip">{t(`roles.${member.role}`)}</span>}>
                  <Match when={isManager() && member.profile_id !== me().profile.id}>
                    <span class="row">
                      <select
                        value={member.role}
                        onChange={(e) => onRole(member, e.currentTarget.value as Member["role"])}
                      >
                        <option value="member">{t("roles.member")}</option>
                        <option value="guardian">{t("roles.guardian")}</option>
                        <option value="manager">{t("roles.manager")}</option>
                      </select>
                      <button type="button" class="link danger" onClick={() => onRemove(member)}>
                        {t("common.remove")}
                      </button>
                    </span>
                  </Match>
                  {/* Members choose for themselves whether their own list shows in this group. */}
                  <Match when={member.profile_id === me().profile.id && member.role !== "manager"}>
                    <select
                      value={member.role}
                      onChange={(e) => onRole(member, e.currentTarget.value as Member["role"])}
                    >
                      <option value="member">{t("roles.member")}</option>
                      <option value="guardian">{t("roles.guardian")}</option>
                    </select>
                  </Match>
                </Switch>
              </li>
            )}
          </For>
        </ul>
        <Show when={adults().some((m) => m.role === "guardian") || !isManager()}>
          <p class="muted small">{t("group.guardianHelp")}</p>
        </Show>
        <Show when={isManager() && (invites()?.length ?? 0) > 0}>
          <h3>{t("group.pendingInvites")}</h3>
          <ul class="list">
            <For each={invites()}>
              {(email) => (
                <li class="list-row">
                  <span class="muted truncate">{email}</span>
                  <span class="row">
                    <button
                      type="button"
                      class="link"
                      onClick={() => run(() => emailInvite(email))}
                    >
                      {t("group.emailInvite")}
                    </button>
                    <button
                      type="button"
                      class="link danger"
                      onClick={() =>
                        run(async () => {
                          await cancelInvite(params.groupId, email);
                          await refetchInvites();
                        })
                      }
                    >
                      {t("common.cancel")}
                    </button>
                  </span>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={isManager()}>
          <form onSubmit={onInvite}>
            <label>
              {t("group.inviteByEmail")}
              <input
                type="email"
                required
                value={inviteEmail()}
                onInput={(e) => setInviteEmail(e.currentTarget.value)}
              />
            </label>
            <button type="submit">{t("group.invite")}</button>
          </form>
          <h3>{t("group.inviteLink")}</h3>
          <p class="muted small">{t("group.inviteLinkHelp")}</p>
          <div class="row">
            <button type="button" onClick={onShareLink}>
              {t("group.shareLink")}
            </button>
            <button type="button" class="secondary" onClick={onResetLink}>
              {t("group.newLink")}
            </button>
          </div>
        </Show>
      </section>

      <section class="card">
        <h2>{t("group.children")}</h2>
        <p class="muted small">{t("group.childrenHelp")}</p>
        <ul class="list">
          <For each={children()} fallback={<li class="muted">{t("group.noChildren")}</li>}>
            {(child) => {
              const childParents = () => parents()?.get(child.profile_id) ?? [];
              const iAmParent = () => childParents().includes(me().profile.id);
              const otherAdults = () =>
                adults().filter((a) => !childParents().includes(a.profile_id));
              return (
                <li class="child">
                  <div class="list-row">
                    <A href={`/lists/${child.profile_id}`}>{child.profiles.display_name}</A>
                    <span class="row">
                      <Show when={isManager() || iAmParent()}>
                        <button type="button" class="link danger" onClick={() => onRemove(child)}>
                          {t("common.remove")}
                        </button>
                      </Show>
                      <Show when={iAmParent()}>
                        <button
                          type="button"
                          class="link danger"
                          onClick={() => onDeleteChild(child)}
                        >
                          {t("common.delete")}
                        </button>
                      </Show>
                    </span>
                  </div>
                  <p class="muted small">
                    {t("group.parents")}{" "}
                    <For each={childParents()} fallback={t("group.noParents")}>
                      {(parentId, i) => (
                        <>
                          {i() > 0 ? ", " : ""}
                          {nameOf(parentId)}
                          <Show when={iAmParent() && childParents().length > 1}>
                            {" "}
                            <button
                              type="button"
                              class="link danger"
                              aria-label={t("group.removeParentLabel", { name: nameOf(parentId) })}
                              onClick={() => onRemoveParent(child, parentId)}
                            >
                              ×
                            </button>
                          </Show>
                        </>
                      )}
                    </For>
                  </p>
                  <Show when={iAmParent() && otherAdults().length > 0}>
                    <select
                      onChange={(e) => onAddParent(child, e.currentTarget.value as ProfileId)}
                    >
                      <option value="">{t("group.addParent")}</option>
                      <For each={otherAdults()}>
                        {(adult) => (
                          <option value={adult.profile_id}>{adult.profiles.display_name}</option>
                        )}
                      </For>
                    </select>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>
        <Show when={myOtherChildren().length > 0}>
          <select onChange={(e) => onAddMyChild(e.currentTarget.value as ProfileId)}>
            <option value="">{t("group.addMyChild")}</option>
            <For each={myOtherChildren()}>
              {(child) => <option value={child.id}>{child.display_name}</option>}
            </For>
          </select>
        </Show>
        <Show when={isManager()}>
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
              <select
                value={childParent() ?? me().profile.id}
                onChange={(e) => setChildParent(e.currentTarget.value as ProfileId)}
              >
                <For each={adults()}>
                  {(adult) => (
                    <option value={adult.profile_id}>
                      {adult.profiles.display_name}
                      {adult.profile_id === me().profile.id ? t("common.you") : ""}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <button type="submit">{t("group.addChild")}</button>
          </form>
        </Show>
      </section>

      <Show when={isManager()}>
        <form class="card" onSubmit={onRename}>
          <label>
            {t("group.groupName")}
            <input
              required
              value={groupName() ?? group()?.name ?? ""}
              onInput={(e) => setGroupName(e.currentTarget.value)}
            />
          </label>
          <button type="submit">{t("group.rename")}</button>
        </form>
      </Show>

      <Show when={myMembership()}>
        {(mine) => (
          <div class="stack">
            <Show
              when={handingOver()}
              fallback={
                <button type="button" class="secondary" onClick={() => onLeave(mine())}>
                  {t("group.leave")}
                </button>
              }
            >
              <div class="card">
                <label>
                  {t("group.chooseSuccessor", { group: group()?.name ?? "" })}
                  <select
                    value={successor() ?? ""}
                    onChange={(e) => setSuccessor(e.currentTarget.value as ProfileId)}
                  >
                    <option value="" disabled>
                      {t("group.chooseMember")}
                    </option>
                    <For each={otherAdultsInGroup()}>
                      {(adult) => (
                        <option value={adult.profile_id}>{adult.profiles.display_name}</option>
                      )}
                    </For>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!successor()}
                  onClick={() => onHandOverAndLeave(mine())}
                >
                  {t("group.handOverAndLeave")}
                </button>
                <button type="button" class="secondary" onClick={() => setHandingOver(false)}>
                  {t("group.stay")}
                </button>
              </div>
            </Show>
            <Show when={isManager()}>
              <button type="button" class="secondary danger" onClick={onDeleteGroup}>
                {t("group.deleteGroup")}
              </button>
            </Show>
          </div>
        )}
      </Show>
    </>
  );
}
