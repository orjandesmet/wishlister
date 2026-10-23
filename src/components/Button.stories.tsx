import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Button, LinkButton } from "./Button.tsx";
import u from "../utilities.module.css";

const meta = {
  title: "Foundations/Button",
  component: Button,
  args: { children: "I bought this" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary", children: "Change date" } };

export const Danger: Story = {
  args: { variant: "secondary", danger: true, children: "Delete group" },
};

export const Small: Story = { args: { variant: "secondary", size: "small", children: "Undo" } };

export const Link: Story = { args: { variant: "link", children: "Edit" } };

export const DangerLink: Story = { args: { variant: "link", danger: true, children: "Remove" } };

export const Disabled: Story = { args: { disabled: true } };

/** A link that goes somewhere but looks like the main action. */
export const AsLink: Story = {
  render: () => (
    <div class={u.stack}>
      <LinkButton href="/groups/new">Add group</LinkButton>
    </div>
  ),
};
