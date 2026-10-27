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
    ...overrides,
  };
  render(() => <MemoryRouter root={() => <GroupCard {...props} />} />, host);
  return host;
}

const secretSantaLink = (host: HTMLElement) =>
  [...host.querySelectorAll("a")].find((a) => a.textContent?.includes(t("groupCard.secretSanta")));
const badges = (host: HTMLElement) =>
  [...host.querySelectorAll("li [title]")].filter(
    (el) => el.getAttribute("title") === t("secretSanta.ribbonFor", { occasion: "Christmas" }),
  );

describe("GroupCard and Secret Santa", () => {
  it("says nothing without a Secret Santa", () => {
    const host = mount();
    expect(secretSantaLink(host)).toBeUndefined();
    expect(badges(host)).toHaveLength(0);
  });

  it("links to the Secret Santa of the next occasion", () => {
    const host = mount({ secretSanta: christmas });
    const link = secretSantaLink(host)!;
    expect(link.getAttribute("href")).toBe("/groups/group-1/secret-santa");
    // Told apart for screen readers, where the card repeats per group.
    expect(link.textContent).toContain("Christmas");
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

  it("links even when the running one isn't the next occasion", () => {
    const later = { ...christmas, id: "later" as OccasionId, name: "Easter" };
    const host = mount({ secretSanta: later });
    expect(secretSantaLink(host)!.textContent).toContain("Easter");
  });
});
