import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { SecretSantaNudge } from "./SecretSantaNudge.tsx";

const now = new Date("2026-12-10T12:00:00Z");

const meta = {
  title: "Groups/SecretSantaNudge",
  component: SecretSantaNudge,
  args: { name: "Sara", lastNudgedAt: null, everyDays: 3, now, onNudge: fn() },
} satisfies Meta<typeof SecretSantaNudge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the list of the person you drew, when it has fewer than 3 items you could buy. */
export const Default: Story = {};

/** Sent less than 3 days ago: disabled, and says when. */
export const NudgedRecently: Story = { args: { lastNudgedAt: "2026-12-08T09:00:00Z" } };

/** 3 days or more: you can nudge again. */
export const NudgedLongAgo: Story = { args: { lastNudgedAt: "2026-12-05T09:00:00Z" } };

/** While the email is being sent. */
export const Busy: Story = { args: { busy: true } };
