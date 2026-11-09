import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { announce } from "./a11y.ts";
import type { NudgeState } from "./api/secretSanta.ts";
import { createActionRunner } from "./createActionRunner.ts";
import { createSecretSantaNudge } from "./createSecretSantaNudge.ts";
import type { ProfileId } from "./ids.ts";

const nudgeState = vi.fn(async (): Promise<NudgeState | null> => null);
const nudgeSecretSanta = vi.fn(async (): Promise<"sent" | "not_set_up"> => "sent");
vi.mock("./api/secretSanta.ts", () => ({
  NUDGE_BELOW_ITEMS: 3,
  getNudgeState: () => nudgeState(),
  nudgeSecretSanta: () => nudgeSecretSanta(),
}));
vi.mock("./a11y.ts", () => ({ announce: vi.fn() }));

const anna = "anna" as ProfileId;
const state = (buyable_items: number) =>
  ({ buyable_items, last_nudged_at: null }) as unknown as NudgeState;

afterEach(() => vi.clearAllMocks());

function setup(drawnAtFirst: boolean) {
  return createRoot((dispose) => {
    const [drawn, setDrawn] = createSignal(drawnAtFirst);
    const nudge = createSecretSantaNudge(
      () => anna,
      drawn,
      () => "Anna",
      createActionRunner(),
    );
    return { nudge, setDrawn, dispose };
  });
}

describe("createSecretSantaNudge", () => {
  it("only looks it up for the person you drew", async () => {
    nudgeState.mockResolvedValue(state(0));
    const { nudge, setDrawn, dispose } = setup(false);
    await Promise.resolve();
    expect(nudgeState).not.toHaveBeenCalled();
    setDrawn(true);
    await vi.waitFor(() => expect(nudge.nudgeable()).toBeDefined());
    dispose();
  });

  it("offers no nudge once the list has enough ideas", async () => {
    nudgeState.mockResolvedValue(state(3));
    const { nudge, dispose } = setup(true);
    await vi.waitFor(() => expect(nudgeState).toHaveBeenCalled());
    await Promise.resolve();
    expect(nudge.nudgeable()).toBeUndefined();
    dispose();
  });

  it("nudges, says how it went, and looks it up again", async () => {
    nudgeState.mockResolvedValue(state(1));
    const { nudge, dispose } = setup(true);
    await vi.waitFor(() => expect(nudge.nudgeable()).toBeDefined());
    await nudge.nudge();
    expect(nudge.notice()).toContain("Anna");
    expect(announce).toHaveBeenCalledWith(nudge.notice());
    expect(nudgeState).toHaveBeenCalledTimes(2);
    expect(nudge.busy()).toBe(false);
    dispose();
  });
});
