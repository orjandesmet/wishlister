import { beforeEach, describe, expect, it } from "vite-plus/test";
import type { GroupId } from "./ids.ts";
import {
  collapsedByDefault,
  initialCollapsed,
  rememberGroupCollapse,
  saveCollapsed,
  setRememberGroupCollapse,
} from "./groupCollapse.ts";

const family = "family" as GroupId;

describe("group collapse", () => {
  beforeEach(() => {
    localStorage.clear();
    setRememberGroupCollapse(true);
  });

  it("remembers by default", () => {
    expect(rememberGroupCollapse()).toBe(true);
  });

  it("starts from the default until you fold or unfold a group", () => {
    expect(initialCollapsed(family)).toBe(collapsedByDefault());
    saveCollapsed(family, !collapsedByDefault());
    expect(initialCollapsed(family)).toBe(!collapsedByDefault());
  });

  it("saves nothing, and forgets what it had, when switched off", () => {
    saveCollapsed(family, !collapsedByDefault());
    setRememberGroupCollapse(false);
    expect(initialCollapsed(family)).toBe(collapsedByDefault());
    saveCollapsed(family, !collapsedByDefault());
    setRememberGroupCollapse(true);
    expect(initialCollapsed(family)).toBe(collapsedByDefault());
  });

  it("ignores a broken saved value", () => {
    localStorage.setItem("group-collapse", "{not json");
    expect(initialCollapsed(family)).toBe(collapsedByDefault());
  });
});
