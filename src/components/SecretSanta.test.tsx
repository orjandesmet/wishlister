import { MemoryRouter } from "@solidjs/router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSanta as Draw, SecretSantaCandidate } from "../lib/api/secretSanta.ts";
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
const person = (id: string, name: string): SecretSantaCandidate => ({
  profile_id: id as ProfileId,
  display_name: name,
});
const draw = (occasionId: string, extra: Partial<Draw> = {}): Draw => ({
  id: `draw-${occasionId}` as SecretSantaId,
  occasion_id: occasionId as OccasionId,
  taking_part: false,
  recipient_profile_id: null,
  recipient_name: null,
  ...extra,
});

const ann = person("ann", "Ann");
const bo = person("bo", "Bo");
const cleo = person("cleo", "Cleo");

const christmas = occasion("xmas", "Christmas", "2026-12-25");
const easter = occasion("easter", "Easter", "2027-03-28");
const lastYear = occasion("old", "Christmas 2025", "2025-12-25");

type Setup = SecretSantaProps & { occasions: Occasion[] };

const props = (overrides: Partial<Setup> = {}): Setup => ({
  occasions: [christmas, easter, lastYear],
  draws: [],
  isManager: false,
  participants: new Map(),
  onRemove: () => {},
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

const buttons = (host: HTMLElement) => [...host.querySelectorAll("button")];
const buttonNamed = (host: HTMLElement, text: RegExp | string) =>
  buttons(host).find((b) =>
    typeof text === "string" ? b.textContent === text : text.test(b.textContent ?? ""),
  )!;
const click = (el: HTMLElement) => el.click();
const startLinks = (host: HTMLElement) =>
  [...host.querySelectorAll("a")].filter((a) => a.textContent?.includes(t("secretSanta.start")));

describe("Secret Santa in the occasions list", () => {
  describe("for members", () => {
    it("shows nothing about Secret Santa when no upcoming occasion has a draw", () => {
      const host = mount(props({ draws: [draw("old")] }));
      expect(host.textContent).not.toContain(t("secretSanta.running"));
      expect(host.textContent).not.toContain(t("secretSanta.notTakingPart"));
      expect(startLinks(host)).toHaveLength(0);
    });

    it("says who you drew, with a link to their list", () => {
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
      const link = host.querySelector("a")!;
      expect(link.textContent).toBe("Bo");
      expect(link.getAttribute("href")).toBe("/lists/bo");
      expect(host.textContent).toContain(t("secretSanta.running"));
    });

    it("says when you don't take part, without any pair", () => {
      const host = mount(props({ draws: [draw("xmas")] }));
      expect(host.textContent).toContain(t("secretSanta.notTakingPart"));
      expect(host.querySelector("a")).toBeNull();
    });

    it("says it under the occasion that has a draw only, and offers no start button", () => {
      const host = mount(props({ draws: [draw("xmas")] }));
      const under = (id: string) => host.querySelector(`[data-occasion="${id}"]`)!.textContent;
      expect(under("xmas")).toContain(t("secretSanta.running"));
      expect(under("easter")).not.toContain(t("secretSanta.running"));
      expect(startLinks(host)).toHaveLength(0);
    });

    it("never shows participants or remove buttons", () => {
      const host = mount(
        props({
          draws: [
            draw("xmas", {
              taking_part: true,
              recipient_profile_id: "bo" as ProfileId,
              recipient_name: "Bo",
            }),
          ],
          participants: new Map([["draw-xmas" as SecretSantaId, [ann, bo]]]),
        }),
      );
      expect(host.textContent).not.toContain(t("secretSanta.participantsHelp"));
      expect(host.textContent).not.toContain("Ann");
    });
  });

  describe("for managers", () => {
    it("links to the start page for every upcoming occasion without a draw", () => {
      const host = mount(props({ isManager: true, draws: [draw("easter")] }));
      const starts = startLinks(host);
      expect(starts).toHaveLength(1);
      expect(starts[0].getAttribute("href")).toBe("/groups/group-1/occasions/xmas/secret-santa");
      // Told apart for screen readers, where the same link repeats.
      expect(starts[0].textContent).toContain("Christmas");
    });

    it("leaves out occasions that have passed", () => {
      const host = mount(props({ isManager: true }));
      const starts = startLinks(host).map((a) => a.textContent);
      expect(starts).toHaveLength(2);
      expect(starts.join()).not.toContain("Christmas 2025");
    });

    it("offers nothing for an occasion that has a draw already", () => {
      const host = mount(props({ isManager: true, draws: [draw("xmas"), draw("easter")] }));
      expect(startLinks(host)).toHaveLength(0);
    });

    it("lists who takes part, never a pair, and removes people", () => {
      const onRemove = vi.fn();
      const d = draw("xmas", {
        taking_part: true,
        recipient_profile_id: "bo" as ProfileId,
        recipient_name: "Bo",
      });
      const host = mount(
        props({
          isManager: true,
          draws: [d],
          participants: new Map([["draw-xmas" as SecretSantaId, [ann, bo, cleo]]]),
          onRemove,
        }),
      );
      const summary = host.querySelector("summary")!;
      expect(summary.textContent).toBe(t("secretSanta.participants", { count: 3 }));
      const remove = buttonNamed(host, /Cleo/);
      // The button names the person it removes, for screen readers.
      expect(remove.textContent).toContain(t("common.remove"));
      click(remove);
      expect(onRemove).toHaveBeenCalledWith(d, cleo);
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
