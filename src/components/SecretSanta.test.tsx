import { MemoryRouter } from "@solidjs/router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type {
  SecretSanta as Draw,
  SecretSantaCandidate,
  SecretSantaInput,
} from "../lib/api/secretSanta.ts";
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
  candidates: [ann, bo, cleo],
  participants: new Map(),
  busy: false,
  onStart: async () => true,
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
const checkbox = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll("label")]
    .find((l) => l.textContent?.trim() === label)!
    .querySelector("input")!;
const click = (el: HTMLElement) => el.click();
/** The Secret Santa form, not the one that adds an occasion. */
const startForm = (host: HTMLElement) =>
  host.querySelector<HTMLFormElement>("form[aria-labelledby]");
const startButtons = (host: HTMLElement) =>
  buttons(host).filter((b) => b.textContent?.includes(t("secretSanta.start")));

describe("Secret Santa in the occasions list", () => {
  describe("for members", () => {
    it("shows nothing about Secret Santa when no upcoming occasion has a draw", () => {
      const host = mount(props({ draws: [draw("old")] }));
      expect(host.textContent).not.toContain(t("secretSanta.running"));
      expect(host.textContent).not.toContain(t("secretSanta.notTakingPart"));
      expect(startButtons(host)).toHaveLength(0);
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
      expect(startButtons(host)).toHaveLength(0);
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
    it("offers to start a draw for every upcoming occasion without one", () => {
      const host = mount(props({ isManager: true, draws: [draw("easter")] }));
      const starts = buttons(host).filter((b) => b.textContent?.includes(t("secretSanta.start")));
      expect(starts).toHaveLength(1);
      // Told apart for screen readers, where the same button repeats.
      expect(starts[0].textContent).toContain("Christmas");
    });

    it("leaves out occasions that have passed", () => {
      const host = mount(props({ isManager: true }));
      const starts = startButtons(host).map((b) => b.textContent);
      expect(starts).toHaveLength(2);
      expect(starts.join()).not.toContain("Christmas 2025");
    });

    it("offers nothing for an occasion that has a draw already", () => {
      const host = mount(props({ isManager: true, draws: [draw("xmas"), draw("easter")] }));
      expect(startButtons(host)).toHaveLength(0);
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

    describe("the form", () => {
      const open = (overrides: Partial<Setup> = {}) => {
        const host = mount(props({ isManager: true, ...overrides }));
        click(buttonNamed(host, new RegExp(`${t("secretSanta.start")}\\s*Christmas`)));
        return host;
      };

      it("ticks everyone who can take part", () => {
        const host = open();
        for (const name of ["Ann", "Bo", "Cleo"]) expect(checkbox(host, name).checked).toBe(true);
        expect(host.querySelector("form fieldset legend")?.textContent).toBe(t("secretSanta.who"));
      });

      it("names the form after its occasion", () => {
        const host = open();
        const form = startForm(host)!;
        const label = document.getElementById(form.getAttribute("aria-labelledby")!)!;
        expect(label.textContent).toContain("Christmas");
      });

      it("sends the participants and no exclusions by default", async () => {
        const onStart = vi.fn(async (_input: SecretSantaInput) => true);
        const host = open({ onStart });
        startForm(host)!.requestSubmit();
        expect(onStart).toHaveBeenCalledWith({
          occasionId: "xmas",
          participants: ["ann", "bo", "cleo"],
          exclusions: [],
        });
      });

      it("leaves out who is unticked", () => {
        const onStart = vi.fn(async (_input: SecretSantaInput) => true);
        const host = open({ onStart });
        click(checkbox(host, "Cleo"));
        startForm(host)!.requestSubmit();
        expect(onStart.mock.calls[0][0].participants).toEqual(["ann", "bo"]);
      });

      it("sets exclusions one way", () => {
        const onStart = vi.fn(async (_input: SecretSantaInput) => true);
        const host = open({ onStart });
        const annsExclusions = [...host.querySelectorAll("details")].find((d) =>
          d.querySelector("summary")?.textContent?.startsWith("Ann"),
        )!;
        const excludeBo = [...annsExclusions.querySelectorAll("label")]
          .find((l) => l.textContent?.trim() === "Bo")!
          .querySelector("input")!;
        click(excludeBo);
        expect(annsExclusions.querySelector("summary")?.textContent).toContain(
          t("secretSanta.excludedCount", { count: 1 }),
        );
        startForm(host)!.requestSubmit();
        expect(onStart.mock.calls[0][0].exclusions).toEqual([{ profile: "ann", excluded: "bo" }]);
      });

      it("drops exclusions of someone who was unticked afterwards", () => {
        const onStart = vi.fn(async (_input: SecretSantaInput) => true);
        const host = open({ onStart });
        const annsExclusions = [...host.querySelectorAll("details")].find((d) =>
          d.querySelector("summary")?.textContent?.startsWith("Ann"),
        )!;
        click(
          [...annsExclusions.querySelectorAll("label")]
            .find((l) => l.textContent?.trim() === "Cleo")!
            .querySelector("input")!,
        );
        click(checkbox(host, "Cleo"));
        startForm(host)!.requestSubmit();
        expect(onStart.mock.calls[0][0].exclusions).toEqual([]);
      });

      it("won't start with fewer than 2 people, and says why", () => {
        const onStart = vi.fn(async (_input: SecretSantaInput) => true);
        const host = open({ onStart });
        click(checkbox(host, "Bo"));
        click(checkbox(host, "Cleo"));
        const submit = buttonNamed(host, t("secretSanta.draw"));
        expect(submit.disabled).toBe(true);
        const hint = document.getElementById(submit.getAttribute("aria-describedby")!)!;
        expect(hint.textContent).toBe(t("secretSanta.needTwo"));
        startForm(host)!.requestSubmit();
        expect(onStart).not.toHaveBeenCalled();
      });

      it("hides the exclusions until two people take part", () => {
        const host = open();
        expect(host.textContent).toContain(t("secretSanta.exclusions"));
        click(checkbox(host, "Bo"));
        click(checkbox(host, "Cleo"));
        expect(host.textContent).not.toContain(t("secretSanta.exclusions"));
      });

      it("says why the draw couldn't start, right by the button", () => {
        const host = open({ error: "No draw is possible: too many exclusions for Cleo." });
        const form = startForm(host)!;
        const alert = form.querySelector('[role="alert"]')!;
        expect(alert.textContent).toBe("No draw is possible: too many exclusions for Cleo.");
        // Between the fields and the buttons, not at the top of the page.
        const submit = buttonNamed(host, t("secretSanta.draw"));
        expect(
          alert.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      });

      it("keeps the message area empty when nothing went wrong", () => {
        const host = open();
        expect(startForm(host)!.querySelector('[role="alert"]')!.textContent).toBe("");
      });

      it("forgets the message when the form is closed", () => {
        const onClearError = vi.fn();
        const host = open({ error: "Nope", onClearError });
        click(buttonNamed(host, t("common.cancel")));
        expect(onClearError).toHaveBeenCalled();
      });

      it("disables the button while drawing", () => {
        const host = open({ busy: true });
        const submit = buttonNamed(host, t("secretSanta.drawing"));
        expect(submit.disabled).toBe(true);
      });

      it("closes once the draw is made, and stays open when it isn't", async () => {
        let result = false;
        const onStart = vi.fn(async () => result);
        const host = open({ onStart });
        startForm(host)!.requestSubmit();
        await Promise.resolve();
        await Promise.resolve();
        expect(startForm(host)).not.toBeNull();

        result = true;
        startForm(host)!.requestSubmit();
        await vi.waitFor(() => expect(startForm(host)).toBeNull());
      });

      it("closes with Cancel and puts the Start button back", async () => {
        const host = open();
        click(buttonNamed(host, t("common.cancel")));
        expect(startForm(host)).toBeNull();
        expect(buttonNamed(host, new RegExp(t("secretSanta.start")))).toBeTruthy();
      });

      it("says so when nobody can take part", () => {
        const host = open({ candidates: [] });
        expect(host.textContent).toContain(t("secretSanta.nobodyToDraw"));
        const submit = buttonNamed(host, t("secretSanta.draw"));
        expect(submit.disabled).toBe(true);
      });
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
});
