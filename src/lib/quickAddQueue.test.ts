import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { QuickAddQueue } from "./quickAddQueue.ts";

const names = (queue: QuickAddQueue<string>) => queue.state.pending.map((item) => item.name);

describe("QuickAddQueue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves everything in one batch after the debounce", async () => {
    const save = vi.fn(async (batch: string[]) => batch);
    const onSaved = vi.fn();
    const queue = new QuickAddQueue({ save, onSaved, debounceMs: 3000 });

    queue.add("Socks");
    await vi.advanceTimersByTimeAsync(2000);
    queue.add("  Book  ");
    queue.add("   ");
    await vi.advanceTimersByTimeAsync(2999);
    expect(save).not.toHaveBeenCalled();
    expect(names(queue)).toEqual(["Socks", "Book"]);

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledExactlyOnceWith(["Socks", "Book"]);
    expect(onSaved).toHaveBeenCalledWith(["Socks", "Book"]);
    expect(queue.state).toEqual({ pending: [], retrying: false });
  });

  it("saves straight away on flush", async () => {
    const save = vi.fn(async (batch: string[]) => batch);
    const queue = new QuickAddQueue({ save });
    queue.add("Socks");
    queue.flush();
    expect(save).toHaveBeenCalledWith(["Socks"]);
    await vi.runAllTimersAsync();
    expect(save).toHaveBeenCalledOnce();
  });

  it("retries with exponential backoff, together with items typed meanwhile", async () => {
    const save = vi
      .fn<(batch: string[]) => Promise<string[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(async (batch) => batch);
    const queue = new QuickAddQueue({ save, debounceMs: 100, retryMs: 1000 });

    queue.add("Socks");
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.state.retrying).toBe(true);

    queue.add("Book");
    await vi.advanceTimersByTimeAsync(999);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenLastCalledWith(["Socks", "Book"]);

    // The second failure waits twice as long.
    await vi.advanceTimersByTimeAsync(1999);
    expect(save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(3);
    expect(queue.state).toEqual({ pending: [], retrying: false });
  });

  it("drops unsaved items and stops retrying on cancel", async () => {
    const save = vi.fn(async () => Promise.reject(new Error("offline")));
    const queue = new QuickAddQueue({ save, debounceMs: 100, retryMs: 1000 });

    queue.add("Socks");
    await vi.advanceTimersByTimeAsync(100);
    queue.cancel();
    expect(queue.state).toEqual({ pending: [], retrying: false });
    await vi.runAllTimersAsync();
    expect(save).toHaveBeenCalledOnce();
  });

  it("drops a batch that fails after cancel", async () => {
    let reject!: (error: Error) => void;
    const save = vi.fn(() => new Promise<string[]>((_, r) => (reject = r)));
    const queue = new QuickAddQueue({ save });

    queue.add("Socks");
    queue.flush();
    queue.cancel();
    reject(new Error("offline"));
    await vi.runAllTimersAsync();
    expect(queue.state).toEqual({ pending: [], retrying: false });
    expect(save).toHaveBeenCalledOnce();
  });

  it("keeps items typed during a save for the next batch", async () => {
    let resolve!: (rows: string[]) => void;
    const save = vi
      .fn<(batch: string[]) => Promise<string[]>>()
      .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
      .mockImplementation(async (batch) => batch);
    const queue = new QuickAddQueue({ save, debounceMs: 100 });

    queue.add("Socks");
    queue.flush();
    queue.add("Book");
    expect(names(queue)).toEqual(["Socks", "Book"]);
    resolve(["Socks"]);
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenLastCalledWith(["Book"]);
  });
});
