import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { describe, expect, it } from "vite-plus/test";
import type { ProfileId } from "../lib/ids.ts";
import { ParentSelect, type ParentOption } from "./ParentSelect.tsx";

const ann = "ann" as ProfileId;
const me = "me" as ProfileId;
const adults = (): ParentOption[] => [
  { id: ann, name: "Ann" },
  { id: me, name: "Me" },
];

describe("ParentSelect", () => {
  it("keeps showing the chosen parent when the options are rebuilt", () => {
    const [options, setOptions] = createSignal(adults());
    const host = document.createElement("div");
    render(
      () => <ParentSelect name="parent" options={options()} value={me} onChange={() => {}} />,
      host,
    );
    const select = host.querySelector("select")!;
    expect(select.value).toBe(me);

    // A refetch hands over new objects, so every option is rendered again.
    setOptions(adults());
    expect(select.value).toBe(me);
  });

  it("reports the picked parent", () => {
    let picked: ProfileId | undefined;
    const host = document.createElement("div");
    render(
      () => <ParentSelect options={adults()} value={me} onChange={(id) => (picked = id)} />,
      host,
    );
    const select = host.querySelector("select")!;
    select.value = ann;
    select.dispatchEvent(new Event("change"));
    expect(picked).toBe(ann);
  });
});
