import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  daysSinceNudge,
  SecretSantaNudge,
  type SecretSantaNudgeProps,
} from "./SecretSantaNudge.tsx";

const now = new Date("2026-12-10T12:00:00Z");

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function mount(overrides: Partial<SecretSantaNudgeProps> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  const props: SecretSantaNudgeProps = {
    name: "Sara",
    lastNudgedAt: null,
    everyDays: 3,
    now,
    onNudge: () => {},
    ...overrides,
  };
  render(() => <SecretSantaNudge {...props} />, host);
  return { host, button: host.querySelector("button")! };
}

describe("daysSinceNudge", () => {
  it("counts whole days", () => {
    expect(daysSinceNudge("2026-12-10T09:00:00Z", now)).toBe(0);
    expect(daysSinceNudge("2026-12-09T11:00:00Z", now)).toBe(1);
    expect(daysSinceNudge("2026-12-07T12:00:00Z", now)).toBe(3);
  });
});

describe("SecretSantaNudge", () => {
  it("nudges when it never did", () => {
    const onNudge = vi.fn();
    const { host, button } = mount({ onNudge });
    expect(button.textContent).toBe("Nudge Sara");
    expect(button.disabled).toBe(false);
    expect(host.textContent).not.toContain("Nudged");
    button.click();
    expect(onNudge).toHaveBeenCalledOnce();
  });

  it("waits 3 days after a nudge, and says when it was", () => {
    const { host, button } = mount({ lastNudgedAt: "2026-12-08T09:00:00Z" });
    expect(button.disabled).toBe(true);
    expect(host.textContent).toContain("Nudged 2 days ago");
    const when = host.querySelector(`#${button.getAttribute("aria-describedby")}`);
    expect(when?.textContent).toBe("Nudged 2 days ago");
  });

  it("can nudge again after 3 days", () => {
    const { host, button } = mount({ lastNudgedAt: "2026-12-07T09:00:00Z" });
    expect(button.disabled).toBe(false);
    expect(host.textContent).toContain("Nudged 3 days ago");
  });

  it("is disabled while sending", () => {
    const { button } = mount({ busy: true });
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Sending…");
  });
});
