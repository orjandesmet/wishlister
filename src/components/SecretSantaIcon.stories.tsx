import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { For } from "solid-js";
import { SecretSantaIcon } from "./SecretSantaIcon.tsx";

// 18 and 22px are where it's used; the rest is to see the drawing.
const sizes = [18, 22, 32, 96];

const backgrounds = [
  { label: "page", color: "var(--text-strong)", background: "var(--surface)" },
  { label: "soft accent", color: "var(--accent-ink)", background: "var(--accent-soft)" },
  { label: "red pill", color: "var(--pill-negative-ink)", background: "var(--pill-negative-bg)" },
];

const meta = {
  title: "Groups/SecretSantaIcon",
  component: SecretSantaIcon,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SecretSantaIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At several sizes, on the page, on the soft accent and on the red pill. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", "flex-wrap": "wrap" }}>
      <For each={backgrounds}>
        {(bg) => (
          <div
            title={bg.label}
            style={{
              display: "flex",
              "align-items": "center",
              gap: "16px",
              padding: "12px 16px",
              "border-radius": "10px",
              color: bg.color,
              background: bg.background,
            }}
          >
            <For each={sizes}>
              {(size) => <SecretSantaIcon style={{ width: `${size}px`, height: `${size}px` }} />}
            </For>
          </div>
        )}
      </For>
    </div>
  ),
};

/** In its two places: the button on the occasions card, and the group card line. */
export const InUse: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "16px", "align-items": "center", "flex-wrap": "wrap" }}>
      <span
        style={{
          display: "inline-flex",
          "align-items": "center",
          gap: "8px",
          "min-height": "48px",
          padding: "0 14px",
          "font-weight": "600",
          color: "var(--accent-ink)",
          background: "var(--accent-soft)",
          "border-radius": "10px",
        }}
      >
        <SecretSantaIcon style={{ width: "22px", height: "22px" }} />
        Start Secret Santa
      </span>
      <span
        style={{
          display: "inline-flex",
          "align-items": "center",
          gap: "6px",
          padding: "4px 10px",
          "font-size": "14px",
          "font-weight": "600",
          color: "var(--pill-negative-ink)",
          background: "var(--pill-negative-bg)",
          "border-radius": "10px",
        }}
      >
        <SecretSantaIcon style={{ width: "18px", height: "18px" }} />
        Secret Santa is running
      </span>
    </div>
  ),
};
