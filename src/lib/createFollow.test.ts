import { createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { announce } from "./a11y.ts";
import { createActionRunner } from "./createActionRunner.ts";
import { createFollow } from "./createFollow.ts";
import type { ProfileId } from "./ids.ts";
import type { IsoDate } from "./occasions.ts";

const follows: { until: IsoDate | null } = { until: null };
vi.mock("./loaders.ts", () => ({
  loadFollowUntil: Object.assign(async () => follows.until, {
    peek: () => undefined,
    prefetch: async () => undefined,
  }),
}));
const followList = vi.fn(async (_id: ProfileId, until: IsoDate) => {
  follows.until = until;
});
const unfollowList = vi.fn(async () => {
  follows.until = null;
});
vi.mock("./api/follows.ts", () => ({
  followList: (id: ProfileId, until: IsoDate) => followList(id, until),
  unfollowList: () => unfollowList(),
}));
vi.mock("./api/occasions.ts", () => ({ getNextSharedOccasion: vi.fn(async () => null) }));
vi.mock("./a11y.ts", () => ({ announce: vi.fn() }));

const anna = "anna" as ProfileId;

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  follows.until = null;
});

async function setup() {
  const runner = createActionRunner();
  const { follow, dispose } = createRoot((dispose) => ({
    follow: createFollow(
      () => anna,
      () => anna,
      runner,
    ),
    dispose,
  }));
  await vi.waitFor(() => expect(follow.followUntil.latest).not.toBeUndefined());
  return { follow, runner, dispose };
}

describe("createFollow", () => {
  it("follows until a date and says so", async () => {
    const { follow, dispose } = await setup();
    expect(follow.isFollowing()).toBe(false);
    await follow.follow("2999-12-25" as IsoDate);
    expect(followList).toHaveBeenCalledWith(anna, "2999-12-25");
    expect(follow.isFollowing()).toBe(true);
    expect(announce).toHaveBeenCalledOnce();
    dispose();
  });

  it("says nothing when following failed", async () => {
    const { follow, runner, dispose } = await setup();
    followList.mockRejectedValueOnce(new Error("offline"));
    await follow.follow("2999-12-25" as IsoDate);
    expect(runner.error()).toBe("offline");
    expect(announce).not.toHaveBeenCalled();
    dispose();
  });

  it("wiggles the bell for a moment when buying started following the list", async () => {
    const { follow, dispose } = await setup();
    vi.useFakeTimers();
    follows.until = "2999-12-25" as IsoDate;
    await follow.afterBuying();
    expect(follow.justFollowed()).toBe(true);
    vi.runAllTimers();
    expect(follow.justFollowed()).toBe(false);

    // Already following: nothing new to say.
    await follow.afterBuying();
    expect(follow.justFollowed()).toBe(false);
    dispose();
  });
});
