import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import type { ProfileId } from "../lib/ids.ts";
import { NotificationSettings } from "./NotificationSettings.tsx";

const meta = {
  title: "Settings/NotificationSettings",
  component: NotificationSettings,
  args: {
    today: "2026-10-23",
    follows: [
      { listId: "a" as ProfileId, name: "Anna", until: "2026-12-25" },
      { listId: "b" as ProfileId, name: "Ben", until: "2026-11-15" },
    ],
    onChangeDate: fn(),
    onUnfollow: fn(),
    onUnfollowAll: fn(),
  },
} satisfies Meta<typeof NotificationSettings>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { follows: [] } };
