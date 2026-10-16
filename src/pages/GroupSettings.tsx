import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
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
  setMemberRole,
  type InviteResult,
  type Member,
} from "../lib/api/groups.ts";
import { useMe } from "../lib/me.tsx";

export default function GroupSettings() {
  const params = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const me = useMe();

  const [group, { refetch: refetchGroup }] = createResource(() => params.groupId, getGroup);
  const members = createMemo(() =>
    [...(group()?.group_members ?? [])].sort((a, b) =>
      a.profiles.display_name.localeCompare(b.profiles.display_name),
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
  const nameOf = (profileId: string) =>
    members().find((m) => m.profile_id === profileId)?.profiles.display_name ?? "someone";
  // My children who aren't in this group yet.
  const myOtherChildren = () =>
    (me().managed() ?? []).filter((c) => !children().some((m) => m.profile_id === c.id));

  const [groupName, setGroupName] = createSignal<string>();
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [childName, setChildName] = createSignal("");
  const [childParent, setChildParent] = createSignal<string>();
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
      setNotice("Group renamed.");
    });
  };

  const onInvite = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await inviteToGroup(params.groupId, inviteEmail());
      const email = inviteEmail().trim();
      const notices: Record<InviteResult, string> = {
        added: `${email} was added to the group.`,
        invited: `${email} will join the group when they first sign in.`,
        already_invited: `${email} is already invited.`,
        already_member: `${email} is already in the group.`,
      };
      setNotice(notices[result]);
      setInviteEmail("");
      await Promise.all([refetchGroup(), refetchInvites()]);
    });
  };

  /** Hands the link to the phone's share sheet, or copies it where there is none. */
  async function shareLink(link: string) {
    const name = group()!.name;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${name} on Wishlister`, url: link });
      } catch (e) {
        // Closing the share sheet isn't an error.
        if ((e as Error).name !== "AbortError") throw e;
      }
    } else {
      await navigator.clipboard.writeText(link);
      setNotice("Invite link copied. Anyone who opens it can join the group.");
    }
  }

  const onShareLink = () => run(async () => shareLink(await getJoinLink(params.groupId)));

  const onResetLink = () =>
    run(async () => {
      if (!confirm("Make a new invite link? Links you shared before will stop working.")) return;
      await resetJoinLink(params.groupId);
      setNotice("New invite link made. Old links don't work anymore.");
    });

  const onAddChild = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      const parent = childParent() ?? me().profile.id;
      await addChild(params.groupId, childName(), parent);
      setNotice(
        parent === me().profile.id
          ? `Added ${childName()}. You look after their list.`
          : `Added ${childName()}. ${nameOf(parent)} looks after their list.`,
      );
      setChildName("");
      setChildParent(undefined);
      await Promise.all([refetchGroup(), refetchParents()]);
      me().refetchManaged();
    });
  };

  const onAddMyChild = (childProfileId: string) =>
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
          ? `Leave ${groupName}?`
          : `Remove ${member.profiles.display_name} from ${groupName}?`,
      ];
      if (isAdult) {
        const leftBehind = childrenLeftBehind(member).map((c) => c.profiles.display_name);
        if (leftBehind.length > 0) {
          lines.push(
            `${leftBehind.join(", ")} will have no parent left in this group, so they'll be removed from it too.`,
          );
        }
        if (adults().length === 1) {
          lines.push(`No one else is left, so ${groupName} will be deleted.`);
        }
      }
      if (!confirm(lines.join("\n\n"))) return;
      const result = await removeMember(params.groupId, member.profile_id);
      if (leaving || result === "group_deleted") navigate("/", { replace: true });
      else await Promise.all([refetchGroup(), refetchParents()]);
    });

  const onRemoveParent = (child: Member, parentProfileId: string) =>
    run(async () => {
      const childName = child.profiles.display_name;
      if (!confirm(`Remove ${nameOf(parentProfileId)} as ${childName}'s parent?`)) return;
      await removeParent(child.profile_id, parentProfileId);
      await refetchParents();
      me().refetchManaged();
    });

  const onDeleteChild = (child: Member) =>
    run(async () => {
      const childName = child.profiles.display_name;
      if (
        !confirm(`Delete ${childName}'s profile and wishlist for everyone? This can't be undone.`)
      )
        return;
      await deleteChild(child.profile_id);
      await refetchGroup();
      me().refetchManaged();
    });

  const onAddParent = (child: Member, parentProfileId: string) =>
    run(async () => {
      if (!parentProfileId) return;
      await addParent(child.profile_id, parentProfileId);
      await refetchParents();
    });

  const onDeleteGroup = () =>
    run(async () => {
      if (!confirm(`Delete ${group()!.name} for everyone? Lists and items are kept.`)) return;
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
  const [successor, setSuccessor] = createSignal<string>();

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
        ‹ Groups
      </A>
      <h1>{group()?.name ?? "Group"}</h1>
      <Show when={group.error}>
        <p class="error">This group isn't available.</p>
      </Show>
      <Show when={notice()}>
        <p class="notice">{notice()}</p>
      </Show>
      <Show when={error()}>
        <p class="error">{error()}</p>
      </Show>

      <section class="card">
        <h2>Members</h2>
        <ul class="list">
          <For each={adults()}>
            {(member) => (
              <li class="list-row">
                <span>
                  {member.profiles.display_name}
                  {member.profile_id === me().profile.id ? " (you)" : ""}
                </span>
                <Show
                  when={isManager() && member.profile_id !== me().profile.id}
                  fallback={
                    <span class="chip">{member.role === "manager" ? "Manager" : "Member"}</span>
                  }
                >
                  <span class="row">
                    <select
                      value={member.role}
                      onChange={(e) => onRole(member, e.currentTarget.value as Member["role"])}
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                    </select>
                    <button type="button" class="link danger" onClick={() => onRemove(member)}>
                      Remove
                    </button>
                  </span>
                </Show>
              </li>
            )}
          </For>
        </ul>
        <Show when={isManager() && (invites()?.length ?? 0) > 0}>
          <h3>Waiting for first sign-in</h3>
          <ul class="list">
            <For each={invites()}>
              {(email) => (
                <li class="list-row">
                  <span class="muted truncate">{email}</span>
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
                    Cancel
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={isManager()}>
          <form onSubmit={onInvite}>
            <label>
              Invite by email
              <input
                type="email"
                required
                value={inviteEmail()}
                onInput={(e) => setInviteEmail(e.currentTarget.value)}
              />
            </label>
            <button type="submit">Invite</button>
          </form>
          <h3>Invite link</h3>
          <p class="muted small">
            Anyone with the link can join, whatever email they sign in with.
          </p>
          <div class="row">
            <button type="button" onClick={onShareLink}>
              Share invite link
            </button>
            <button type="button" class="secondary" onClick={onResetLink}>
              New link
            </button>
          </div>
        </Show>
      </section>

      <section class="card">
        <h2>Children</h2>
        <p class="muted small">Children don't sign in. Their parents look after their list.</p>
        <ul class="list">
          <For each={children()} fallback={<li class="muted">No children in this group.</li>}>
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
                          Remove
                        </button>
                      </Show>
                      <Show when={iAmParent()}>
                        <button
                          type="button"
                          class="link danger"
                          onClick={() => onDeleteChild(child)}
                        >
                          Delete
                        </button>
                      </Show>
                    </span>
                  </div>
                  <p class="muted small">
                    Parents:{" "}
                    <For each={childParents()} fallback="nobody in this group">
                      {(parentId, i) => (
                        <>
                          {i() > 0 ? ", " : ""}
                          {nameOf(parentId)}
                          <Show when={iAmParent() && childParents().length > 1}>
                            {" "}
                            <button
                              type="button"
                              class="link danger"
                              aria-label={`Remove ${nameOf(parentId)} as parent`}
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
                    <select onChange={(e) => onAddParent(child, e.currentTarget.value)}>
                      <option value="">Add a parent…</option>
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
          <select onChange={(e) => onAddMyChild(e.currentTarget.value)}>
            <option value="">Add one of your children…</option>
            <For each={myOtherChildren()}>
              {(child) => <option value={child.id}>{child.display_name}</option>}
            </For>
          </select>
        </Show>
        <Show when={isManager()}>
          <form onSubmit={onAddChild}>
            <label>
              Add a new child
              <input
                required
                placeholder="Name"
                value={childName()}
                onInput={(e) => setChildName(e.currentTarget.value)}
              />
            </label>
            <label>
              Parent
              <select
                value={childParent() ?? me().profile.id}
                onChange={(e) => setChildParent(e.currentTarget.value)}
              >
                <For each={adults()}>
                  {(adult) => (
                    <option value={adult.profile_id}>
                      {adult.profiles.display_name}
                      {adult.profile_id === me().profile.id ? " (you)" : ""}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <button type="submit">Add child</button>
          </form>
        </Show>
      </section>

      <Show when={isManager()}>
        <form class="card" onSubmit={onRename}>
          <label>
            Group name
            <input
              required
              value={groupName() ?? group()?.name ?? ""}
              onInput={(e) => setGroupName(e.currentTarget.value)}
            />
          </label>
          <button type="submit">Rename</button>
        </form>
      </Show>

      <Show when={myMembership()}>
        {(mine) => (
          <div class="stack">
            <Show
              when={handingOver()}
              fallback={
                <button type="button" class="secondary" onClick={() => onLeave(mine())}>
                  Leave group
                </button>
              }
            >
              <div class="card">
                <label>
                  You're the only manager. Who should manage {group()?.name} after you leave?
                  <select
                    value={successor() ?? ""}
                    onChange={(e) => setSuccessor(e.currentTarget.value)}
                  >
                    <option value="" disabled>
                      Choose a member…
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
                  Make manager and leave
                </button>
                <button type="button" class="secondary" onClick={() => setHandingOver(false)}>
                  Stay in the group
                </button>
              </div>
            </Show>
            <Show when={isManager()}>
              <button type="button" class="secondary danger" onClick={onDeleteGroup}>
                Delete group
              </button>
            </Show>
          </div>
        )}
      </Show>
    </>
  );
}
