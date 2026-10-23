import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { For } from "solid-js";
import { Select } from "../components/Select.tsx";
import u from "../utilities.module.css";
import { Button, LinkButton } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Check } from "../components/Check.tsx";
import { Chip, ChipButton, Chips as ChipRow } from "../components/Chip.tsx";
import loginStyles from "../pages/Login.module.css";

/**
 * The building blocks from src/index.css, the shared components and utilities.module.css on one
 * page. Change a token or a class there and every story (and the app) follows.
 */
const meta = {
  title: "Foundations/Styles",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const tokens = [
  "--bg",
  "--surface",
  "--text",
  "--text-strong",
  "--muted",
  "--border",
  "--accent",
  "--danger",
];

export const Colours: Story = {
  render: () => (
    <ul class={`${u.list} ${u.cards}`}>
      <For each={tokens}>
        {(token) => (
          <Card as="li" class={u.row}>
            <code>{token}</code>
            <span
              style={{
                width: "48px",
                height: "32px",
                background: `var(${token})`,
                border: "1px solid var(--border)",
                "border-radius": "8px",
              }}
            />
          </Card>
        )}
      </For>
    </ul>
  ),
};

export const Typography: Story = {
  render: () => (
    <div class={u.stack}>
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <p>Body text in the default colour.</p>
      <p class={u.muted}>Muted text for hints.</p>
      <p class={`${u.muted} ${u.small}`}>Small muted text.</p>
      <p class={u.error}>An error message.</p>
      <a class={u.link} href="#">
        A link
      </a>
    </div>
  ),
};

export const Buttons: Story = {
  render: () => (
    <div class={u.stack}>
      <button type="button">Primary</button>
      <button type="button" disabled>
        Disabled
      </button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="secondary" danger>
        Secondary danger
      </Button>
      <Button variant="secondary" size="small">
        Small
      </Button>
      <div class={u.row}>
        <Button variant="link">Link button</Button>
        <Button variant="link" danger>
          Danger link
        </Button>
      </div>
      <LinkButton href="#">Link styled as a button</LinkButton>
    </div>
  ),
};

export const FormFields: Story = {
  render: () => (
    <Card as="form" onSubmit={(e) => e.preventDefault()}>
      <label>
        Text field
        <input placeholder="e.g. Family" />
      </label>
      <label>
        Code
        <input class={loginStyles.codeInput} value="123456" />
      </label>
      <fieldset>
        <legend>Visible in</legend>
        <Check>
          <input type="checkbox" checked /> All groups
        </Check>
        <Check class={u.indent}>
          <input type="checkbox" /> Family
        </Check>
      </fieldset>
      <label>
        Select
        <Select>
          <option>Member</option>
          <option>Manager</option>
        </Select>
      </label>
      <button type="submit">Save</button>
    </Card>
  ),
};

export const Chips: Story = {
  render: () => (
    <div class={u.stack}>
      <ChipRow>
        <Chip>Toys</Chip>
        <Chip>child</Chip>
        <Chip>Manager</Chip>
      </ChipRow>
      <ChipRow>
        <ChipButton>Books</ChipButton>
        <ChipButton>Clothes</ChipButton>
      </ChipRow>
    </div>
  ),
};
