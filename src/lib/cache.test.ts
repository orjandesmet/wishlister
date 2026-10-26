import { createRoot } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { cached, clearCache, createCachedResource } from "./cache.ts";
import { isReady } from "./resource.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve));

/** A fetcher whose loads finish when the test says so. */
function controlled() {
  const pending: ((value: string) => void)[] = [];
  const fetcher = vi.fn<(arg: string) => Promise<string>>(
    () => new Promise((done) => pending.push(done)),
  );
  const finish = (value: string) => pending.shift()!(value);
  return { fetcher, finish };
}

beforeEach(() => clearCache());

describe("cached", () => {
  it("remembers results by argument", async () => {
    const load = cached("test", async (arg: string) => `value of ${arg}`);
    expect(load.peek("a")).toBeUndefined();
    await load("a");
    expect(load.peek("a")).toBe("value of a");
    expect(load.peek("b")).toBeUndefined();
  });

  it("joins a load already on its way", async () => {
    const { fetcher, finish } = controlled();
    const load = cached("test", fetcher);
    const first = load("a");
    const second = load("a");
    finish("one");
    expect(await first).toBe("one");
    expect(await second).toBe("one");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("doesn't keep a load that started before the cache was cleared", async () => {
    const { fetcher, finish } = controlled();
    const load = cached("test", fetcher);
    const old = load("a");
    clearCache();
    // Not joined: the change that cleared the cache may not be in the old load.
    const fresh = load("a");
    expect(fetcher).toHaveBeenCalledTimes(2);
    finish("before");
    await old;
    expect(load.peek("a")).toBeUndefined();
    finish("after");
    await fresh;
    expect(load.peek("a")).toBe("after");
  });

  it("prefetches only when there's nothing recent", async () => {
    const fetcher = vi.fn(async (arg: string) => arg);
    const load = cached("test", fetcher);
    await load.prefetch("a");
    await load.prefetch("a");
    expect(fetcher).toHaveBeenCalledTimes(1);
    await load.prefetch("a", 0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("swallows a failed prefetch", async () => {
    const load = cached("test", async () => {
      throw new Error("offline");
    });
    await expect(load.prefetch("a")).resolves.toBeUndefined();
    expect(load.peek("a")).toBeUndefined();
  });
});

describe("createCachedResource", () => {
  it("starts unresolved when nothing is remembered", () => {
    const load = cached("test", async (arg: string) => arg);
    createRoot((dispose) => {
      const [data] = createCachedResource(() => "a", load);
      expect(isReady(data)).toBe(false);
      dispose();
    });
  });

  it("is ready at once with the remembered value, and refreshes it", async () => {
    const { fetcher, finish } = controlled();
    const load = cached("test", fetcher);
    const first = load("a");
    finish("old");
    await first;
    const { data, dispose } = createRoot((dispose) => {
      const [data] = createCachedResource(() => "a", load);
      return { data, dispose };
    });
    expect(isReady(data)).toBe(true);
    expect(data()).toBe("old");
    expect(data.loading).toBe(true);
    finish("new");
    await tick();
    expect(data()).toBe("new");
    expect(load.peek("a")).toBe("new");
    dispose();
  });

  it("waits for a source like a plain resource", () => {
    const load = cached("test", async (arg: string) => arg);
    createRoot((dispose) => {
      const [data] = createCachedResource(() => undefined, load);
      expect(isReady(data)).toBe(false);
      dispose();
    });
  });
});
