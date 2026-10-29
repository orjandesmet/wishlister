import { MemoryRouter } from "@solidjs/router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { Member } from "../lib/api/groups.ts";
import { t } from "../lib/i18n.ts";
import type { AccountId, GroupId, OccasionId, ProfileId } from "../lib/ids.ts";
import { GroupCard, type GroupCardProps } from "./GroupCard.tsx";

const member = (id: string, name: string): Member => ({
  profile_id: id as ProfileId,
  role: "member",
  profiles: { id: id as ProfileId, display_name: name, account_id: `account-${id}` as AccountId },
});
const christmas = {
  id: "xmas" as OccasionId,
  group_id: "group-1" as GroupId,
  name: "Christmas",
  date: "2026-12-25",
};

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function mount(overrides: Partial<GroupCardProps> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  const props: GroupCardProps = {
    group: {
      id: "group-1" as GroupId,
      name: "Family",
      group_members: [member("me", "Orjan"), member("anna", "Anna"), member("bert", "Bert")],
    },
    myProfileId: "me" as ProfileId,
    nextOccasion: christmas,
    today: "2026-10-21",
    startCollapsed: false,
    ...overrides,
  };
  render(() => <MemoryRouter root={() => <GroupCard {...props} />} />, host);
  return host;
}

const secretSantaLine = (host: HTMLElement) =>
  [...host.querySelectorAll("p")].find((p) => p.textContent?.includes(t("groupCard.secretSanta")));
const badges = (host: HTMLElement) =>
  [...host.querySelectorAll("li [title]")].filter(
    (el) => el.getAttribute("title") === t("secretSanta.ribbonFor", { occasion: "Christmas" }),
  );

describe("GroupCard and Secret Santa", () => {
  it("says nothing without a Secret Santa", () => {
    const host = mount();
    expect(secretSantaLine(host)).toBeUndefined();
    expect(badges(host)).toHaveLength(0);
  });

  it("says a Secret Santa is running, as text rather than a link", () => {
    const host = mount({ secretSanta: christmas });
    const line = secretSantaLine(host)!;
    expect(line.querySelector("a")).toBeNull();
    // Told apart for screen readers, where the card repeats per group.
    expect(line.textContent).toContain("Christmas");
    expect(line.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("gives only the member you drew the badge, next to their name", () => {
    const host = mount({ secretSanta: christmas, drawnProfileId: "bert" as ProfileId });
    expect(badges(host)).toHaveLength(1);
    const row = badges(host)[0].closest("li")!;
    expect(row.textContent).toContain("Bert");
    expect(row.textContent).not.toContain("Anna");
    // The same icon-only badge as in the list menu.
    expect(badges(host)[0].className).toMatch(/iconOnly/);
  });

  it("puts it under the event name, beside the days left, for the next occasion", () => {
    const host = mount({ secretSanta: christmas });
    const line = secretSantaLine(host)!;
    expect(line.closest('[role="group"]')).not.toBeNull();
    expect(line.previousElementSibling?.textContent).toContain("Christmas");
    expect(line.textContent).toBe(t("groupCard.secretSanta") + " Christmas");
  });

  it("says which occasion it is for when that isn't the next one", () => {
    const later = { ...christmas, id: "later" as OccasionId, name: "Easter" };
    const host = mount({ secretSanta: later });
    const line = secretSantaLine(host)!;
    expect(line.closest('[role="group"]')).toBeNull();
    expect(line.textContent).toBe(t("groupCard.secretSantaFor", { occasion: "Easter" }));
  });

  it("says which occasion it is for when the group has no next occasion", () => {
    const host = mount({ secretSanta: christmas, nextOccasion: undefined });
    expect(secretSantaLine(host)!.textContent).toBe(
      t("groupCard.secretSantaFor", { occasion: "Christmas" }),
    );
  });
});

describe("GroupCard members", () => {
  const names = (host: HTMLElement) =>
    [...host.querySelectorAll("li")].map((li) => li.textContent?.trim());
  const toggle = (host: HTMLElement) => host.querySelector<HTMLButtonElement>("[aria-expanded]")!;

  it("folds the members away and back with one button", () => {
    const host = mount({ startCollapsed: true });
    expect(names(host)).toHaveLength(0);
    expect(toggle(host).getAttribute("aria-expanded")).toBe("false");
    expect(toggle(host).textContent).toContain(t("groupCard.showMembers", { count: 3 }));
    // Tells the groups apart for screen readers.
    expect(toggle(host).textContent).toContain("Family");
    expect(host.querySelector(`#${toggle(host).getAttribute("aria-controls")}`)?.tagName).toBe(
      "UL",
    );

    toggle(host).click();
    expect(toggle(host).getAttribute("aria-expanded")).toBe("true");
    expect(names(host)).toHaveLength(3);
    expect(toggle(host).textContent).toContain(t("groupCard.hideMembers"));
  });

  it("keeps the member you drew in sight while folded", () => {
    const host = mount({
      startCollapsed: true,
      secretSanta: christmas,
      drawnProfileId: "bert" as ProfileId,
    });
    expect(names(host)).toHaveLength(1);
    expect(names(host)[0]).toContain("Bert");
    // Above the button, not under it.
    const row = host.querySelector("li")!;
    expect(
      row.compareDocumentPosition(toggle(host)) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(badges(host)).toHaveLength(1);
  });
});
