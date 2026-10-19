import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { LanguageSelect } from "./LanguageSelect.tsx";

const meta = {
  title: "App/LanguageSelect",
  component: LanguageSelect,
  args: { value: "en", onChange: fn() },
  argTypes: { value: { control: "inline-radio", options: ["en", "nl"] } },
} satisfies Meta<typeof LanguageSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the account page. Use the globe in the toolbar to see every story in Dutch. */
export const Default: Story = {};
