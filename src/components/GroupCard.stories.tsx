import type { Meta, StoryObj } from "storybook-solidjs-vite";
import type { Member } from "../lib/api/groups.ts";
import type { AccountId, GroupId, OccasionId, ProfileId } from "../lib/ids.ts";
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
    today: "2026-10-21",
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

/** A parent who's only there for their child: their own list isn't shown in this group. */
export const WithGuardian: Story = {
  args: {
    group: {
      id: "group-3" as GroupId,
      name: "Grandparents",
      group_members: [
        makeMember("oma", "Oma", "manager"),
        makeMember("me", "Orjan", "guardian"),
        makeMember("lucas", "Lucas", "member", true),
      ],
    },
  },
};

/** The group's next occasion shows under its name. */
export const WithNextOccasion: Story = {
  args: {
    nextOccasion: {
      id: "occasion-1" as OccasionId,
      group_id: "group-1" as GroupId,
      name: "Christmas 2026",
      date: "2026-12-25",
      theme: null,
    },
  },
};

export const OccasionToday: Story = {
  args: {
    nextOccasion: {
      id: "occasion-2" as OccasionId,
      group_id: "group-1" as GroupId,
      name: "Birthday Anna",
      date: "2026-10-21",
      theme: null,
    },
  },
};
