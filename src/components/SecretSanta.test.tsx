import { MemoryRouter } from "@solidjs/router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSanta as Draw } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, OccasionId, ProfileId, SecretSantaId } from "../lib/ids.ts";
import { Occasions } from "./Occasions.tsx";
import type { SecretSantaProps } from "./SecretSanta.tsx";
import { SecretSantaRibbon } from "./SecretSantaRibbon.tsx";

const occasion = (id: string, name: string, date: string): Occasion => ({
  id: id as OccasionId,
  group_id: "group-1" as GroupId,
  name,
  date,
});
const draw = (occasionId: string, extra: Partial<Draw> = {}): Draw => ({
  id: `draw-${occasionId}` as SecretSantaId,
  occasion_id: occasionId as OccasionId,
  taking_part: false,
  recipient_profile_id: null,
  recipient_name: null,
  ...extra,
});

const christmas = occasion("xmas", "Christmas", "2026-12-25");
const easter = occasion("easter", "Easter", "2027-03-28");
const lastYear = occasion("old", "Christmas 2025", "2025-12-25");

type Setup = SecretSantaProps & { occasions: Occasion[] };

const props = (overrides: Partial<Setup> = {}): Setup => ({
  occasions: [christmas, easter, lastYear],
  draws: [],
  isManager: false,
  ...overrides,
});

const hosts: HTMLElement[] = [];
function mount({ occasions, ...secretSanta }: Setup) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  render(
    () => (
      <MemoryRouter
        root={() => (
          <Occasions
            occasions={occasions}
            today="2026-10-21"
            canEdit={secretSanta.isManager}
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
  vi.restoreAllMocks();
});

const secretSantaLinks = (host: HTMLElement) =>
  [...host.querySelectorAll("a")].filter((a) => a.getAttribute("href")?.endsWith("/secret-santa"));

describe("Secret Santa in the occasions list", () => {
  describe("for members", () => {
    it("shows nothing when no occasion has a draw", () => {
      const host = mount(props());
      expect(secretSantaLinks(host)).toHaveLength(0);
    });

    it("links to the page of an occasion that has a draw, and no other", () => {
      const host = mount(props({ draws: [draw("xmas")] }));
      const links = secretSantaLinks(host);
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute("href")).toBe("/groups/group-1/occasions/xmas/secret-santa");
      expect(links[0].textContent).toContain(t("secretSanta.view"));
      // Told apart for screen readers, where the same link repeats.
      expect(links[0].textContent).toContain("Christmas");
    });

    it("keeps everything else for the page: no pair, no participants", () => {
      const host = mount(
        props({
          draws: [
            draw("xmas", {
              taking_part: true,
              recipient_profile_id: "bo" as ProfileId,
              recipient_name: "Bo",
            }),
          ],
        }),
      );
      expect(host.textContent).not.toContain(t("secretSanta.running"));
      expect(host.textContent).not.toContain("Bo");
      expect(host.querySelector("details[open], summary")?.textContent ?? "").not.toContain(
        t("secretSanta.participants", { count: 1 }),
      );
    });

    it("has no link for a draw of a passed occasion", () => {
      const host = mount(props({ draws: [draw("old")] }));
      expect(secretSantaLinks(host)).toHaveLength(0);
    });
  });

  describe("for managers", () => {
    it("links to the start page for every upcoming occasion without a draw", () => {
      const host = mount(props({ isManager: true, draws: [draw("easter")] }));
      const starts = secretSantaLinks(host).filter((a) =>
        a.textContent?.includes(t("secretSanta.start")),
      );
      expect(starts).toHaveLength(1);
      expect(starts[0].getAttribute("href")).toBe("/groups/group-1/occasions/xmas/secret-santa");
      expect(starts[0].textContent).toContain("Christmas");
    });

    it("links to the page of a running one without offering to start", () => {
      const host = mount(props({ isManager: true, draws: [draw("xmas"), draw("easter")] }));
      const texts = secretSantaLinks(host).map((a) => a.textContent ?? "");
      expect(texts).toHaveLength(2);
      expect(texts.every((text) => text.includes(t("secretSanta.view")))).toBe(true);
    });

    it("leaves out occasions that have passed", () => {
      const host = mount(props({ isManager: true }));
      const links = secretSantaLinks(host);
      expect(links).toHaveLength(2);
      expect(links.map((a) => a.textContent).join()).not.toContain("Christmas 2025");
    });
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

  it("can be just the gift, with the words kept for screen readers", () => {
    const host = document.createElement("div");
    render(() => <SecretSantaRibbon iconOnly />, host);
    const badge = host.firstElementChild!;
    expect(badge.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(badge.textContent).toBe(t("secretSanta.ribbon"));
    expect(badge.getAttribute("title")).toBe(t("secretSanta.ribbon"));
    expect(badge.className).toMatch(/iconOnly/);
  });
});
