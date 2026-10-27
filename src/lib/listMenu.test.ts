import { describe, expect, it } from "vite-plus/test";
import type { Group, Member, Role } from "./api/groups.ts";
import type { AccountId, GroupId, ProfileId } from "./ids.ts";
import { listMenuSections } from "./listMenu.ts";

const compare = (a: string, b: string) => a.localeCompare(b, "en");
const member = (id: string, name: string, role: Role = "member", child = false): Member => ({
  profile_id: id as ProfileId,
  role,
  profiles: {
    id: id as ProfileId,
    display_name: name,
    account_id: child ? null : (`acc-${id}` as AccountId),
  },
});
const group = (name: string, members: Member[]): Group => ({
  id: name as GroupId,
  name,
  group_members: members,
});
const own = [
  { id: "me" as ProfileId, name: "My list", person: "Orjan" },
  { id: "lucas" as ProfileId, name: "Lucas's wishlist", person: "Lucas" },
];
const ids = (sections: ReturnType<typeof listMenuSections>) =>
  sections.map((s) => [s.title, s.options.map((o) => o.id)]);

describe("listMenuSections", () => {
  it("puts your own lists on top, then each group's other members by name", () => {
    const groups = [
      group("Family", [
        member("me", "Orjan", "manager"),
        member("lucas", "Lucas", "member", true),
        member("zoe", "Zoë"),
        member("ann", "Ann"),
      ]),
    ];
    expect(ids(listMenuSections(own, groups, compare))).toEqual([
      [undefined, ["me", "lucas"]],
      ["Family", ["ann", "zoe"]],
    ]);
  });

  it("lists someone under every group they share with you", () => {
    const groups = [
      group("Family", [member("me", "Orjan"), member("ann", "Ann")]),
      group("Friends", [member("me", "Orjan"), member("ann", "Ann"), member("bo", "Bo")]),
    ];
    expect(ids(listMenuSections(own, groups, compare))).toEqual([
      [undefined, ["me", "lucas"]],
      ["Family", ["ann"]],
      ["Friends", ["ann", "bo"]],
    ]);
  });

  it("leaves out guardians but keeps their children, and other people's children", () => {
    const groups = [
      group("School", [
        member("me", "Orjan", "guardian"),
        member("lucas", "Lucas", "member", true),
        member("dad", "Dad", "guardian"),
        member("kim", "Kim", "member", true),
      ]),
    ];
    expect(ids(listMenuSections(own, groups, compare))).toEqual([
      [undefined, ["me", "lucas"]],
      ["School", ["kim"]],
    ]);
  });

  it("skips groups with nobody else to show", () => {
    const groups = [group("Just us", [member("me", "Orjan"), member("lucas", "Lucas")])];
    expect(ids(listMenuSections(own, groups, compare))).toEqual([[undefined, ["me", "lucas"]]]);
  });

  it("gives the people you drew in a Secret Santa a ribbon, wherever they are listed", () => {
    const groups = [
      group("Family", [member("me", "Orjan"), member("ann", "Ann"), member("bo", "Bo")]),
      group("Friends", [member("me", "Orjan"), member("ann", "Ann")]),
    ];
    const sections = listMenuSections(own, groups, compare, ["ann" as ProfileId]);
    expect(sections.map((s) => s.options.map((o) => [o.id, o.ribbon ?? false]))).toEqual([
      [
        ["me", false],
        ["lucas", false],
      ],
      [
        ["ann", true],
        ["bo", false],
      ],
      [["ann", true]],
    ]);
  });

  it("has no ribbons when you drew nobody", () => {
    const groups = [group("Family", [member("me", "Orjan"), member("ann", "Ann")])];
    const options = listMenuSections(own, groups, compare).flatMap((s) => s.options);
    expect(options.some((o) => o.ribbon)).toBe(false);
  });
});
