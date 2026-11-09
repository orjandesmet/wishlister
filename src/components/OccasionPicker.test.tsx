import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { GroupId, OccasionId } from "../lib/ids.ts";
import type { IsoDate } from "../lib/occasions.ts";
import { OccasionPicker } from "./OccasionPicker.tsx";

const occasion = (id: string, name: string, date: string): Occasion => ({
  id: id as OccasionId,
  group_id: "g" as GroupId,
  name,
  date: date as IsoDate,
});

// Solid listens for clicks on the document, so the picker has to be in it.
afterEach(() => document.body.replaceChildren());

function setup() {
  const onPick = vi.fn();
  const onCancel = vi.fn();
  const host = document.body.appendChild(document.createElement("div"));
  render(
    () => (
      <OccasionPicker
        choices={[
          occasion("xmas", "Christmas", "2026-12-25"),
          occasion("bday", "Birthday", "2027-02-01"),
        ]}
        onPick={onPick}
        onCancel={onCancel}
      />
    ),
    host,
  );
  const buttons = [...host.querySelectorAll("button")];
  return { host, buttons, onPick, onCancel };
}

describe("OccasionPicker", () => {
  it("is a labelled group with a button per occasion, none, and Cancel", () => {
    const { host, buttons } = setup();
    const group = host.querySelector("[role=group]")!;
    expect(host.querySelector(`#${group.getAttribute("aria-labelledby")}`)).not.toBeNull();
    expect(buttons).toHaveLength(4);
    expect(buttons[0].textContent).toContain("Christmas");
    expect(buttons[1].textContent).toContain("Birthday");
    // Focus comes back to the occasions once the purchase is saved.
    expect(buttons.filter((b) => b.hasAttribute("data-purchase"))).toHaveLength(2);
  });

  it("reports the occasion picked, or none, with the click", () => {
    const { buttons, onPick, onCancel } = setup();
    buttons[1].click();
    expect(onPick).toHaveBeenLastCalledWith("bday", expect.any(MouseEvent));
    buttons[2].click();
    expect(onPick).toHaveBeenLastCalledWith(null, expect.any(MouseEvent));
    expect(onCancel).not.toHaveBeenCalled();
    buttons[3].click();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
