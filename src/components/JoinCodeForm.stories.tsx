import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { JoinCodeForm } from "./JoinCodeForm.tsx";

const meta = {
  title: "App/JoinCodeForm",
  component: JoinCodeForm,
  args: { onJoin: fn() },
} satisfies Meta<typeof JoinCodeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the groups page. Type a code or paste an invite link; anything else shows an error. */
export const Default: Story = {};
