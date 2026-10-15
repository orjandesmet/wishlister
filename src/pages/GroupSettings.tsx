import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import {
  addChild,
  addParent,
  cancelInvite,
  deleteGroup,
  getGroup,
  getInvites,
  getParents,
  inviteToGroup,
  removeMember,
  renameGroup,
  setMemberRole,
  type Member,
} from "../lib/api.ts";
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
  const nameOfAccount = (accountId: string) =>
    adults().find((m) => m.profiles.account_id === accountId)?.profiles.display_name ?? "someone";

  const [groupName, setGroupName] = createSignal<string>();
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [childName, setChildName] = createSignal("");
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
      setNotice(
        result === "added"
          ? `${inviteEmail()} was added to the group.`
          : result === "invited"
            ? `${inviteEmail()} will join the group when they first sign in.`
            : `${inviteEmail()} is already in the group.`,
      );
      setInviteEmail("");
      await Promise.all([refetchGroup(), refetchInvites()]);
    });
  };

  const onAddChild = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      await addChild(params.groupId, childName());
      setNotice(`Added ${childName()}. You manage their list.`);
      setChildName("");
      await refetchGroup();
      me().refetchManaged();
    });
  };

  const onRole = (member: Member, role: Member["role"]) =>
    run(async () => {
      await setMemberRole(params.groupId, member.profile_id, role);
      await refetchGroup();
    });

  const onRemove = (member: Member) =>
    run(async () => {
      const leaving = member.profile_id === me().profile.id;
      const question = leaving
        ? `Leave ${group()!.name}?`
        : `Remove ${member.profiles.display_name} from ${group()!.name}?`;
      if (!confirm(question)) return;
      await removeMember(params.groupId, member.profile_id);
      if (leaving) navigate("/", { replace: true });
      else await refetchGroup();
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
        </Show>
      </section>

      <section class="card">
        <h2>Children</h2>
        <p class="muted small">Children don't sign in. Their parents look after their list.</p>
        <ul class="list">
          <For each={children()} fallback={<li class="muted">No children in this group.</li>}>
            {(child) => {
              const childParents = () => parents()?.get(child.profile_id) ?? [];
              const iAmParent = () => childParents().includes(me().accountId);
              const otherAdults = () =>
                adults().filter((a) => !childParents().includes(a.profiles.account_id!));
              return (
                <li class="child">
                  <div class="list-row">
                    <A href={`/lists/${child.profile_id}`}>{child.profiles.display_name}</A>
                    <Show when={isManager()}>
                      <button type="button" class="link danger" onClick={() => onRemove(child)}>
                        Remove
                      </button>
                    </Show>
                  </div>
                  <p class="muted small">
                    Managed by{" "}
                    {childParents().map(nameOfAccount).join(", ") || "nobody in this group"}
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
        <Show when={isManager()}>
          <form onSubmit={onAddChild}>
            <label>
              Add a child profile
              <input
                required
                placeholder="Name"
                value={childName()}
                onInput={(e) => setChildName(e.currentTarget.value)}
              />
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
            <button type="button" class="secondary" onClick={() => onRemove(mine())}>
              Leave group
            </button>
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
