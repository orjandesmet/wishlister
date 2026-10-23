import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Person } from "./Person.tsx";

const meta = {
  title: "Foundations/Person",
  component: Person,
  args: { id: "anna", name: "Anna" },
} satisfies Meta<typeof Person>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Other text beside the avatar, such as "(you)". */
export const WithText: Story = {
  args: { id: "me", name: "Orjan", children: "Orjan (you)" },
};

export const AsLink: Story = { args: { href: "/lists/anna" } };
