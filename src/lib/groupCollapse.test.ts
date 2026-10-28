import { beforeEach, describe, expect, it } from "vite-plus/test";
import type { GroupId } from "./ids.ts";
import {
  groupCollapseMode,
  initialCollapsed,
  saveCollapsed,
  setGroupCollapseMode,
} from "./groupCollapse.ts";

const family = "family" as GroupId;

describe("group collapse", () => {
  beforeEach(() => {
    localStorage.clear();
    setGroupCollapseMode("remember");
  });

  it("remembers by default, and starts collapsed until you open a group", () => {
    expect(groupCollapseMode()).toBe("remember");
    expect(initialCollapsed(family)).toBe(true);
    saveCollapsed(family, false);
    expect(initialCollapsed(family)).toBe(false);
  });

  it("always starts collapsed, saves nothing and forgets what it had, in always mode", () => {
    saveCollapsed(family, false);
    setGroupCollapseMode("always");
    expect(initialCollapsed(family)).toBe(true);
    saveCollapsed(family, false);
    setGroupCollapseMode("remember");
    expect(initialCollapsed(family)).toBe(true);
  });

  it("ignores a broken saved value", () => {
    localStorage.setItem("group-collapse", "{not json");
    expect(initialCollapsed(family)).toBe(true);
  });
});
