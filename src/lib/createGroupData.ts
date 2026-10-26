import { createMemo, createResource } from "solid-js";
import { getParents } from "./api/children.ts";
import { getInvites } from "./api/groups.ts";
import { createCachedResource } from "./cache.ts";
import { loadGroup } from "./loaders.ts";
import { compareNames, t } from "./i18n.ts";
import type { GroupId, ProfileId } from "./ids.ts";
import { useMe } from "./me.tsx";

/** Everything a group's settings page loads, and who in it is who. */
export function createGroupData(groupId: () => GroupId) {
  const me = useMe();

  const [group, { refetch: refetchGroup }] = createCachedResource(groupId, loadGroup);
  const members = createMemo(() =>
    [...(group()?.group_members ?? [])].sort((a, b) =>
      compareNames(a.profiles.display_name, b.profiles.display_name),
    ),
  );
  const adults = () => members().filter((m) => m.profiles.account_id);
  const children = () => members().filter((m) => !m.profiles.account_id);
  const isManager = () =>
    members().some((m) => m.profile_id === me().profile.id && m.role === "manager");
  const myMembership = () => members().find((m) => m.profile_id === me().profile.id);

  const [invites, { refetch: refetchInvites }] = createResource(
    () => (isManager() ? groupId() : undefined),
    getInvites,
  );
  const [parents, { refetch: refetchParents }] = createResource(
    () => children().map((c) => c.profile_id),
    getParents,
  );
  const nameOf = (profileId: ProfileId) =>
    members().find((m) => m.profile_id === profileId)?.profiles.display_name ?? t("common.someone");

  return {
    groupId,
    group,
    refetchGroup,
    members,
    adults,
    children,
    isManager,
    myMembership,
    invites,
    refetchInvites,
    parents,
    refetchParents,
    nameOf,
  };
}

export type GroupData = ReturnType<typeof createGroupData>;
