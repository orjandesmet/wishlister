import { MemoryRouter } from "@solidjs/router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { Occasion } from "../lib/api/occasions.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, OccasionId } from "../lib/ids.ts";
import { Occasions } from "./Occasions.tsx";
import type { SecretSantaLinkProps } from "./SecretSanta.tsx";
import { SecretSantaRibbon } from "./SecretSantaRibbon.tsx";

const occasion = (id: string, name: string, date: string): Occasion => ({
  id: id as OccasionId,
  group_id: "group-1" as GroupId,
  name,
  date,
});

const christmas = occasion("xmas", "Christmas", "2026-12-25");
const easter = occasion("easter", "Easter", "2027-03-28");
const lastYear = occasion("old", "Christmas 2025", "2025-12-25");

const props = (overrides: Partial<SecretSantaLinkProps> = {}): SecretSantaLinkProps => ({
  group: "group-1" as GroupId,
  canStart: false,
  ...overrides,
});

const hosts: HTMLElement[] = [];
function mount(secretSanta?: SecretSantaLinkProps) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  render(
    () => (
      <MemoryRouter
        root={() => (
          <Occasions
            occasions={[christmas, easter, lastYear]}
            today="2026-10-21"
            canEdit={secretSanta?.canStart ?? false}
            onAdd={async () => true}
            onUpdate={async () => true}
            onDelete={() => {}}
            secretSanta={secretSanta}
          />
        )}
      />
    ),
    host,
  );
  return host;
}
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

const links = (host: HTMLElement) =>
  [...host.querySelectorAll("a")].filter((a) => a.getAttribute("href")?.endsWith("/secret-santa"));

describe("The Secret Santa button in the occasions list", () => {
  it("is left out when the page gives none", () => {
    expect(links(mount())).toHaveLength(0);
  });

  it("shows nothing to a member while nothing runs", () => {
    expect(links(mount(props()))).toHaveLength(0);
  });

  it("is one button for the whole group, whatever the number of occasions", () => {
    const host = mount(props({ canStart: true }));
    expect(links(host)).toHaveLength(1);
  });

  it("offers a manager to start one, on the group's Secret Santa page", () => {
    const [link] = links(mount(props({ canStart: true })));
    expect(link.getAttribute("href")).toBe("/groups/group-1/secret-santa");
    expect(link.textContent).toBe(t("secretSanta.start"));
  });

  it("names the occasion of the running one, for members and managers alike", () => {
    for (const canStart of [false, true]) {
      const [link] = links(mount(props({ running: christmas, canStart })));
      expect(link.textContent).toBe(t("secretSanta.viewFor", { occasion: "Christmas" }));
    }
  });

  it("has Santa beside the words, hidden from screen readers", () => {
    const [link] = links(mount(props({ canStart: true })));
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("sits under the occasions, not beside Edit and Delete", () => {
    const [link] = links(mount(props({ canStart: true })));
    expect(link.closest("li")).toBeNull();
  });
});

describe("SecretSantaRibbon", () => {
  const ribbon = (occasion?: string) => {
    const host = document.createElement("div");
    render(() => <SecretSantaRibbon occasion={occasion} />, host);
    return host;
  };

  it("says it in words, not just with a picture", () => {
    const host = ribbon();
    expect(host.textContent).toBe(t("secretSanta.ribbon"));
    expect(host.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("tells screen readers and hovering people which occasion it's for", () => {
    const host = ribbon("Christmas");
    const text = t("secretSanta.ribbonFor", { occasion: "Christmas" });
    expect(host.firstElementChild?.getAttribute("title")).toBe(text);
    expect(host.textContent).toContain(text);
  });

  it("can be just the Santa, with the words kept for screen readers", () => {
    const host = document.createElement("div");
    render(() => <SecretSantaRibbon iconOnly />, host);
    const badge = host.firstElementChild!;
    expect(badge.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(badge.textContent).toBe(t("secretSanta.ribbon"));
    expect(badge.getAttribute("title")).toBe(t("secretSanta.ribbon"));
    expect(badge.className).toMatch(/iconOnly/);
  });
});
