import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { SecretSantaIcon } from "./SecretSantaIcon.tsx";

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function mount(ui: () => unknown) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  render(ui as () => never, host);
  return host;
}

// The visible question mark is the only <use> drawn outside the <defs>.
const visibleQuestionMarks = (host: HTMLElement) => host.querySelectorAll("svg > use");
// The masks cut a gap around it, one <use> in each of the two masks.
const questionMarkGaps = (host: HTMLElement) => host.querySelectorAll("mask use[transform]");

describe("SecretSantaIcon", () => {
  it("draws the question mark and its gaps by default", () => {
    const host = mount(() => <SecretSantaIcon />);
    expect(visibleQuestionMarks(host)).toHaveLength(1);
    expect(questionMarkGaps(host)).toHaveLength(2);
  });

  it("leaves out the question mark and its gaps without hasQuestionMark", () => {
    const host = mount(() => <SecretSantaIcon hasQuestionMark={false} />);
    expect(visibleQuestionMarks(host)).toHaveLength(0);
    expect(questionMarkGaps(host)).toHaveLength(0);
  });

  it("follows hasQuestionMark when it changes", () => {
    const [shown, setShown] = createSignal(true);
    const host = mount(() => <SecretSantaIcon hasQuestionMark={shown()} />);
    setShown(false);
    expect(visibleQuestionMarks(host)).toHaveLength(0);
    setShown(true);
    expect(visibleQuestionMarks(host)).toHaveLength(1);
  });
});
