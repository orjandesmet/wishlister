import { createSignal } from "solid-js";
import type { GroupId } from "./ids.ts";

/** "always": every group starts collapsed. "remember": each group starts the way you left it. */
export type GroupCollapseMode = "always" | "remember";

const modeKey = "group-collapse-mode";
const statesKey = "group-collapse";

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}

/** The saved states, group id → collapsed. Anything unreadable counts as nothing saved. */
function readStates(): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(readStorage(statesKey) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

// The account's choice is on the profile (profiles.group_collapse); this device keeps a copy so
// the groups page follows it before the profile has loaded. Which groups are open stays here only.
const [groupCollapseMode, setModeSignal] = createSignal<GroupCollapseMode>(
  readStorage(modeKey) === "always" ? "always" : "remember",
);

/** How group cards start on the groups page; "remember" unless you picked "always". */
export { groupCollapseMode };

/** Follows the profile's choice, and keeps a copy on this device. "always" forgets what was remembered. */
export function setGroupCollapseMode(mode: GroupCollapseMode) {
  setModeSignal(mode);
  writeStorage(modeKey, mode);
  if (mode === "always") writeStorage(statesKey, null);
}

/** Whether a group's members start collapsed: as you left them if remembered, else collapsed. */
export function initialCollapsed(groupId: GroupId) {
  if (groupCollapseMode() === "remember") {
    const saved = readStates()[groupId];
    if (typeof saved === "boolean") return saved;
  }
  return true;
}

/** Remembers a group's state in localStorage, unless every group always starts collapsed. */
export function saveCollapsed(groupId: GroupId, collapsed: boolean) {
  if (groupCollapseMode() !== "remember") return;
  writeStorage(statesKey, JSON.stringify({ ...readStates(), [groupId]: collapsed }));
}
