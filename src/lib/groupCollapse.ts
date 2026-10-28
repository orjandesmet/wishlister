import { createSignal } from "solid-js";
import type { GroupId } from "./ids.ts";

const rememberKey = "remember-group-collapse";
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

const [rememberGroupCollapse, setRememberSignal] = createSignal(readStorage(rememberKey) !== "off");

/** True (the default) when this device remembers which groups you collapsed. */
export { rememberGroupCollapse };

/** Switches remembering on or off. Off forgets what was saved, so every visit starts fresh. */
export function setRememberGroupCollapse(on: boolean) {
  setRememberSignal(on);
  writeStorage(rememberKey, on ? "on" : "off");
  if (!on) writeStorage(statesKey, null);
}

/** Phones start with members collapsed; wide screens, with cards side by side, show them. */
export function collapsedByDefault() {
  try {
    return !matchMedia("(min-width: 900px)").matches;
  } catch {
    return true;
  }
}

/** Whether a group's members start collapsed: as you left them, if remembered, or the default. */
export function initialCollapsed(groupId: GroupId) {
  if (rememberGroupCollapse()) {
    const saved = readStates()[groupId];
    if (typeof saved === "boolean") return saved;
  }
  return collapsedByDefault();
}

/** Remembers a group's state on this device, if you want that. */
export function saveCollapsed(groupId: GroupId, collapsed: boolean) {
  if (!rememberGroupCollapse()) return;
  writeStorage(statesKey, JSON.stringify({ ...readStates(), [groupId]: collapsed }));
}
