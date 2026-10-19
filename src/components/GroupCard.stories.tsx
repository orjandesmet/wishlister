import type { Meta, StoryObj } from "storybook-solidjs-vite";
import type { Member } from "../lib/api/groups.ts";
import type { AccountId, GroupId, ProfileId } from "../lib/ids.ts";
import { GroupCard } from "./GroupCard.tsx";

const makeMember = (id: string, name: string, role: Member["role"], child = false): Member => ({
  profile_id: id as ProfileId,
  role,
  profiles: {
    id: id as ProfileId,
    display_name: name,
    account_id: child ? null : (`account-${id}` as AccountId),
  },
});

const meta = {
  title: "Groups/GroupCard",
  component: GroupCard,
  args: {
    myProfileId: "me" as ProfileId,
    group: {
      id: "group-1" as GroupId,
      name: "Family",
      group_members: [
        makeMember("me", "Orjan", "member"),
        makeMember("anna", "Anna", "manager"),
        makeMember("lucas", "Lucas", "member", true),
        makeMember("bert", "Bert", "member"),
      ],
    },
  },
} satisfies Meta<typeof GroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsMember: Story = {};

/** Managers get "Manage" instead of "Details". */
export const AsManager: Story = {
  args: {
    group: {
      ...meta.args.group,
      group_members: meta.args.group.group_members.map((m) =>
        m.profile_id === "me" ? { ...m, role: "manager" } : m,
      ),
    },
  },
};

export const OnlyYou: Story = {
  args: {
    group: {
      id: "group-2" as GroupId,
      name: "Book club",
      group_members: [makeMember("me", "Orjan", "manager")],
    },
  },
};
