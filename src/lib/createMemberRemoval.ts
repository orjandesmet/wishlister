import { useNavigate } from "@solidjs/router";
import { announce, focusHeading } from "./a11y.ts";
import { removeMember, type Member } from "./api/groups.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import type { GroupData } from "./createGroupData.ts";
import { formatList, t } from "./i18n.ts";
import type { ProfileId } from "./ids.ts";
import { useMe } from "./me.tsx";

/** Removing a member (or leaving), after confirming what it would leave behind. */
export function createMemberRemoval(
  data: GroupData,
  runner: ActionRunner,
  /** The occasions of the running Secret Santa draws this member takes part in. */
  secretSantasOf: (member: ProfileId) => string[] = () => [],
) {
  const navigate = useNavigate();
  const me = useMe();

  /** Children who'd have no parent left in this group once `adult` is gone. */
  const childrenLeftBehind = (adult: Member) =>
    data.children().filter((child) => {
      const childParents = data.parents()?.get(child.profile_id) ?? [];
      return !data
        .adults()
        .some((a) => a.profile_id !== adult.profile_id && childParents.includes(a.profile_id));
    });

  return (member: Member) =>
    runner.run(async () => {
      const groupName = data.group()!.name;
      const leaving = member.profile_id === me().profile.id;
      const isAdult = !!member.profiles.account_id;
      // Nobody leaves while taking part in a Secret Santa that hasn't ended: a manager
      // removes them from it first (the database says so too).
      const secretSantas = secretSantasOf(member.profile_id);
      if (secretSantas.length > 0) {
        const occasions = formatList(secretSantas);
        throw new Error(
          leaving
            ? t("secretSanta.leaveBlocked", { occasions })
            : t("secretSanta.removeBlocked", { name: member.profiles.display_name, occasions }),
        );
      }
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
        if (data.adults().length === 1) {
          lines.push(t("group.groupWillBeDeleted", { group: groupName }));
        }
      }
      if (!confirm(lines.join("\n\n"))) return;
      const result = await removeMember(data.groupId(), member.profile_id);
      if (leaving || result === "group_deleted") navigate("/", { replace: true });
      else {
        await Promise.all([data.refetchGroup(), data.refetchParents()]);
        // Their row, and the button just pressed, are gone.
        announce(t("a11y.removed", { item: member.profiles.display_name }));
        focusHeading();
      }
    });
}
