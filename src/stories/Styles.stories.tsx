import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { For } from "solid-js";

/**
 * The building blocks from src/index.css on one page. Change a token or a class
 * there and every story (and the app) follows.
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
    <ul class="list cards">
      <For each={tokens}>
        {(token) => (
          <li class="card row">
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
          </li>
        )}
      </For>
    </ul>
  ),
};

export const Typography: Story = {
  render: () => (
    <div class="stack">
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <p>Body text in the default colour.</p>
      <p class="muted">Muted text for hints.</p>
      <p class="muted small">Small muted text.</p>
      <p class="error">An error message.</p>
      <a class="link" href="#">
        A link
      </a>
    </div>
  ),
};

export const Buttons: Story = {
  render: () => (
    <div class="stack">
      <button type="button">Primary</button>
      <button type="button" disabled>
        Disabled
      </button>
      <button type="button" class="secondary">
        Secondary
      </button>
      <button type="button" class="secondary danger">
        Secondary danger
      </button>
      <button type="button" class="secondary small">
        Small
      </button>
      <div class="row">
        <button type="button" class="link">
          Link button
        </button>
        <button type="button" class="link danger">
          Danger link
        </button>
      </div>
      <a class="button" href="#">
        Link styled as a button
      </a>
    </div>
  ),
};

export const FormFields: Story = {
  render: () => (
    <form class="card" onSubmit={(e) => e.preventDefault()}>
      <label>
        Text field
        <input placeholder="e.g. Family" />
      </label>
      <label>
        Code
        <input class="code-input" value="123456" />
      </label>
      <fieldset>
        <legend>Visible in</legend>
        <label class="check">
          <input type="checkbox" checked /> All groups
        </label>
        <label class="check indent">
          <input type="checkbox" /> Family
        </label>
      </fieldset>
      <label>
        Select
        <select>
          <option>Member</option>
          <option>Manager</option>
        </select>
      </label>
      <button type="submit">Save</button>
    </form>
  ),
};

export const Chips: Story = {
  render: () => (
    <div class="stack">
      <div class="chips">
        <span class="chip">Toys</span>
        <span class="chip">child</span>
        <span class="chip">Manager</span>
      </div>
      <div class="chips">
        <button type="button" class="chip-button">
          Books
        </button>
        <button type="button" class="chip-button">
          Clothes
        </button>
      </div>
    </div>
  ),
};
