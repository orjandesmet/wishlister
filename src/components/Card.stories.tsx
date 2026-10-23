import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Card } from "./Card.tsx";
import u from "../utilities.module.css";

const meta = {
  title: "Foundations/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <h2>Occasions</h2>
      <p class={`${u.muted} ${u.small}`}>Birthdays and holidays everyone in the group buys for.</p>
    </Card>
  ),
};

/** A form that is a card, like the account page's name field. */
export const AsForm: Story = {
  render: () => (
    <Card as="form" onSubmit={(e) => e.preventDefault()}>
      <label>
        Your name
        <input value="Orjan" />
      </label>
      <button type="submit">Save name</button>
    </Card>
  ),
};
