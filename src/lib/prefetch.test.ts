import { describe, expect, it, vi } from "vite-plus/test";
import type { Group } from "./api/groups.ts";
import type { GroupId, ProfileId } from "./ids.ts";
import { prefetchTarget, visibleLists } from "./prefetch.ts";

// Only the pure helpers are tested here; the loaders would need Supabase.
vi.mock("./loaders.ts", () => ({}));

const id = (s: string) => s as ProfileId;

describe("prefetchTarget", () => {
  it("knows the pages worth loading ahead", () => {
    expect(prefetchTarget("/")).toEqual({ page: "home" });
    expect(prefetchTarget("/lists/p1")).toEqual({ page: "list", profileId: "p1" });
    expect(prefetchTarget("/groups/g1")).toEqual({ page: "group", groupId: "g1" });
  });

  it("leaves the rest alone", () => {
    expect(prefetchTarget("/groups/new")).toBeUndefined();
    expect(prefetchTarget("/lists/p1/items/new")).toBeUndefined();
    expect(prefetchTarget("/settings")).toBeUndefined();
  });
});

describe("visibleLists", () => {
  const member = (profileId: string, role: "manager" | "member" | "guardian" = "member") => ({
    profile_id: id(profileId),
    role,
    profiles: { id: id(profileId), display_name: profileId, account_id: null },
  });
  const group = (members: ReturnType<typeof member>[]): Group => ({
    id: "g" as GroupId,
    name: "Family",
    group_members: members,
  });

  it("puts your own lists first and lists everyone else once", () => {
    const groups = [group([member("bob"), member("me")]), group([member("bob"), member("carol")])];
    expect(visibleLists([id("me"), id("kid")], groups)).toEqual(["me", "kid", "bob", "carol"]);
  });

  it("skips guardians, whose list the group doesn't show", () => {
    expect(visibleLists([id("me")], [group([member("dan", "guardian")])])).toEqual(["me"]);
  });
});
