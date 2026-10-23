import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { LinkButton } from "./Button.tsx";
import { EmptyState } from "./EmptyState.tsx";
import u from "../utilities.module.css";

const meta = {
  title: "Foundations/EmptyState",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <EmptyState>
      <p class={u.muted}>You're not in a group yet. Create one, or open an invite link.</p>
      <LinkButton href="/groups/new">Add group</LinkButton>
    </EmptyState>
  ),
};
