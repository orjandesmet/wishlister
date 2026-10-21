import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { FollowList } from "./FollowList.tsx";

const meta = {
  title: "Wishlist/FollowList",
  component: FollowList,
  args: {
    name: "Anna",
    until: null,
    suggestedUntil: "2026-12-25",
    suggestedOccasion: "Christmas 2026",
    today: "2026-10-21",
    onFollow: fn(),
    onUnfollow: fn(),
  },
} satisfies Meta<typeof FollowList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Not following yet. "Follow" opens the date, set to the next shared occasion. */
export const NotFollowing: Story = {};

/** No shared occasion coming up: the date starts a month from today. */
export const NoOccasion: Story = {
  args: { suggestedUntil: "2026-11-20", suggestedOccasion: undefined },
};

export const Following: Story = { args: { until: "2026-12-25" } };

/** The end date passed: same as not following. */
export const Ended: Story = { args: { until: "2026-10-01" } };
