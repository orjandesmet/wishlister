import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Avatar } from "./Avatar.tsx";
import u from "../utilities.module.css";

const meta = {
  title: "Foundations/Avatar",
  component: Avatar,
  args: { id: "anna", name: "Anna" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = { args: { size: "lg" } };

/** Each person keeps one hue wherever they show up. */
export const Family: Story = {
  render: () => (
    <div class={u.row} style={{ "justify-content": "flex-start" }}>
      <Avatar id="me" name="Orjan" />
      <Avatar id="anna" name="Anna" />
      <Avatar id="bert" name="Bert" />
      <Avatar id="lucas" name="Lucas" />
      <Avatar id="eva" name="Eva" />
      <Avatar id="carla" name="Carla" />
    </div>
  ),
};
