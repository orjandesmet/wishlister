import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import type { ProfileId } from "../lib/ids.ts";
import { ParentSelect } from "./ParentSelect.tsx";

const meta = {
  title: "Groups/ParentSelect",
  component: ParentSelect,
  args: {
    options: [
      { id: "ann" as ProfileId, name: "Ann" },
      { id: "me" as ProfileId, name: "Orjan (you)" },
    ],
    value: "me" as ProfileId,
    onChange: fn(),
  },
} satisfies Meta<typeof ParentSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The manager adding a child is the default parent. */
export const Default: Story = {};

/** Another member picked as parent. */
export const OtherParent: Story = { args: { value: "ann" as ProfileId } };
