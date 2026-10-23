import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Button } from "./Button.tsx";
import { Popover } from "./Popover.tsx";

const meta = {
  title: "Foundations/Popover",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Under its button on wide screens; a sheet on the bottom edge on phones (try the viewport). */
export const Open: Story = {
  render: () => (
    <div style={{ padding: "20px", display: "flex", "justify-content": "flex-end" }}>
      <Button
        variant="secondary"
        popovertarget="story-popover"
        style={{ "anchor-name": "--story" }}
      >
        Rename
      </Button>
      <Popover
        id="story-popover"
        anchor="--story"
        sheet
        ref={(el) => queueMicrotask(() => el.showPopover())}
      >
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            Group name
            <input value="Family" />
          </label>
          <button type="submit">Rename</button>
        </form>
      </Popover>
    </div>
  ),
};
