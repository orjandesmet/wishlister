import { MemoryRouter } from "@solidjs/router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSantaCandidate, SecretSantaInput } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, OccasionId, ProfileId } from "../lib/ids.ts";
import { SecretSantaForm, type SecretSantaFormProps } from "./SecretSantaForm.tsx";

const person = (id: string, name: string): SecretSantaCandidate => ({
  profile_id: id as ProfileId,
  display_name: name,
});
const ann = person("ann", "Ann");
const bo = person("bo", "Bo");
const cleo = person("cleo", "Cleo");
const christmas: Occasion = {
  id: "xmas" as OccasionId,
  group_id: "group-1" as GroupId,
  name: "Christmas",
  date: "2026-12-25",
};

const newYear: Occasion = {
  id: "ny" as OccasionId,
  group_id: "group-1" as GroupId,
  name: "New Year",
  date: "2027-01-01",
};

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function open(overrides: Partial<SecretSantaFormProps> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  const props: SecretSantaFormProps = {
    occasions: [christmas, newYear],
    candidates: [ann, bo, cleo],
    busy: false,
    cancelHref: "/groups/group-1",
    onSubmit: () => {},
    ...overrides,
  };
  render(() => <MemoryRouter root={() => <SecretSantaForm {...props} />} />, host);
  return host;
}

const form = (host: HTMLElement) => host.querySelector("form")!;
const submitButton = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const checkbox = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll("label")]
    .find((l) => l.textContent?.trim() === label)!
    .querySelector("input")!;
const occasionSelect = (host: HTMLElement) => host.querySelectorAll("select")[0];
const loopSelect = (host: HTMLElement) => host.querySelectorAll("select")[1];
const loopOptions = (host: HTMLElement) =>
  [...loopSelect(host).querySelectorAll("option")].map((o) => o.textContent);
const pick = (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
};
const many = [ann, bo, cleo, person("dan", "Dan"), person("eva", "Eva"), person("fay", "Fay")];
const exclusionsOf = (host: HTMLElement, name: string) =>
  [...host.querySelectorAll("details")].find((d) =>
    d.querySelector("summary")?.textContent?.startsWith(name),
  )!;
const checkboxIn = (parent: HTMLElement, label: string) =>
  [...parent.querySelectorAll("label")]
    .find((l) => l.textContent?.trim() === label)!
    .querySelector("input")!;

describe("SecretSantaForm", () => {
  it("ticks everyone who can take part", () => {
    const host = open();
    for (const name of ["Ann", "Bo", "Cleo"]) expect(checkbox(host, name).checked).toBe(true);
    expect(host.querySelector("fieldset legend")?.textContent).toBe(t("secretSanta.who"));
  });

  it("offers the occasions, with the first chosen", () => {
    const host = open();
    const options = [...occasionSelect(host).querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toHaveLength(2);
    expect(options[0]).toContain("Christmas");
    expect(options[1]).toContain("New Year");
    expect(occasionSelect(host).value).toBe("xmas");
  });

  it("sends the chosen occasion", () => {
    const onSubmit = vi.fn<(input: SecretSantaInput) => void>();
    const host = open({ onSubmit });
    const select = occasionSelect(host);
    select.value = "ny";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    form(host).requestSubmit();
    expect(onSubmit.mock.calls[0][0].occasionId).toBe("ny");
  });

  it("sends the participants and no exclusions by default", () => {
    const onSubmit = vi.fn();
    const host = open({ onSubmit });
    form(host).requestSubmit();
    expect(onSubmit).toHaveBeenCalledWith({
      occasionId: "xmas",
      participants: ["ann", "bo", "cleo"],
      exclusions: [],
      minLoopSize: "all",
    });
  });

  it("leaves out who is unticked", () => {
    const onSubmit = vi.fn<(input: SecretSantaInput) => void>();
    const host = open({ onSubmit });
    checkbox(host, "Cleo").click();
    form(host).requestSubmit();
    expect(onSubmit.mock.calls[0][0].participants).toEqual(["ann", "bo"]);
  });

  it("sets exclusions one way", () => {
    const onSubmit = vi.fn<(input: SecretSantaInput) => void>();
    const host = open({ onSubmit });
    const anns = exclusionsOf(host, "Ann");
    checkboxIn(anns, "Bo").click();
    expect(anns.querySelector("summary")?.textContent).toContain(
      t("secretSanta.excludedCount", { count: 1 }),
    );
    form(host).requestSubmit();
    expect(onSubmit.mock.calls[0][0].exclusions).toEqual([{ profile: "ann", excluded: "bo" }]);
  });

  it("drops exclusions of someone who was unticked afterwards", () => {
    const onSubmit = vi.fn<(input: SecretSantaInput) => void>();
    const host = open({ onSubmit });
    checkboxIn(exclusionsOf(host, "Ann"), "Cleo").click();
    checkbox(host, "Cleo").click();
    form(host).requestSubmit();
    expect(onSubmit.mock.calls[0][0].exclusions).toEqual([]);
  });

  it("won't start with fewer than 2 people, and says why", () => {
    const onSubmit = vi.fn();
    const host = open({ onSubmit });
    checkbox(host, "Bo").click();
    checkbox(host, "Cleo").click();
    const submit = submitButton(host);
    expect(submit.disabled).toBe(true);
    const hint = document.getElementById(submit.getAttribute("aria-describedby")!)!;
    expect(hint.textContent).toBe(t("secretSanta.needTwo"));
    form(host).requestSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hides the exclusions until two people take part", () => {
    const host = open();
    expect(host.textContent).toContain(t("secretSanta.exclusions"));
    checkbox(host, "Bo").click();
    checkbox(host, "Cleo").click();
    expect(host.textContent).not.toContain(t("secretSanta.exclusions"));
  });

  it("says why the draw couldn't start, right by the button", () => {
    const host = open({ error: "No draw is possible: too many exclusions for Cleo." });
    const alert = form(host).querySelector('[role="alert"]')!;
    expect(alert.textContent).toBe("No draw is possible: too many exclusions for Cleo.");
    // Between the fields and the buttons.
    expect(
      alert.compareDocumentPosition(submitButton(host)) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the message area empty when nothing went wrong", () => {
    const host = open();
    expect(form(host).querySelector('[role="alert"]')!.textContent).toBe("");
  });

  it("disables the button while drawing", () => {
    const host = open({ busy: true });
    expect(submitButton(host).textContent).toBe(t("secretSanta.drawing"));
    expect(submitButton(host).disabled).toBe(true);
  });

  it("cancels with a link back to the group", () => {
    const host = open();
    const cancel = [...host.querySelectorAll("a")].find(
      (a) => a.textContent === t("common.cancel"),
    )!;
    expect(cancel.getAttribute("href")).toBe("/groups/group-1");
  });

  it("can't start without an occasion", () => {
    const onSubmit = vi.fn();
    const host = open({ occasions: [], onSubmit });
    form(host).requestSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is disabled when nobody can take part", () => {
    const host = open({ candidates: [] });
    expect(submitButton(host).disabled).toBe(true);
  });

  describe("the minimum loop size", () => {
    it("offers only 'All', disabled, below 4 participants", () => {
      const host = open();
      expect(loopOptions(host)).toEqual([t("secretSanta.loopAll")]);
      expect(loopSelect(host).disabled).toBe(true);
    });

    it("offers 2 up to half the participants, then 'All', with 'All' chosen", () => {
      const host = open({ candidates: many });
      expect(loopOptions(host)).toEqual(["2", "3", t("secretSanta.loopAll")]);
      expect(loopSelect(host).value).toBe("all");
      expect(loopSelect(host).disabled).toBe(false);
    });

    it("follows who takes part", () => {
      const host = open({ candidates: many });
      checkbox(host, "Fay").click();
      expect(loopOptions(host)).toEqual(["2", t("secretSanta.loopAll")]);
      checkbox(host, "Eva").click();
      checkbox(host, "Dan").click();
      expect(loopOptions(host)).toEqual([t("secretSanta.loopAll")]);
    });

    it("sends what was picked", () => {
      const onSubmit = vi.fn<(input: SecretSantaInput) => void>();
      const host = open({ candidates: many, onSubmit });
      pick(loopSelect(host), "3");
      form(host).requestSubmit();
      expect(onSubmit.mock.calls[0][0].minLoopSize).toBe(3);
    });

    it("sends the biggest that is still offered when fewer people take part afterwards", () => {
      const onSubmit = vi.fn<(input: SecretSantaInput) => void>();
      const host = open({ candidates: many, onSubmit });
      pick(loopSelect(host), "3");
      checkbox(host, "Fay").click();
      checkbox(host, "Eva").click();
      form(host).requestSubmit();
      expect(onSubmit.mock.calls[0][0].minLoopSize).toBe(2);
    });

    it("is explained, and the help is tied to the dropdown", () => {
      const host = open({ candidates: many });
      const help = document.getElementById(loopSelect(host).getAttribute("aria-describedby")!)!;
      expect(help.textContent).toBe(t("secretSanta.minLoopHelp"));
    });

    it("is left out while fewer than 2 people take part", () => {
      const host = open();
      checkbox(host, "Bo").click();
      checkbox(host, "Cleo").click();
      expect(host.querySelectorAll("select")).toHaveLength(1);
    });
  });
});
