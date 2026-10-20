import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { QuickAddQueue, type PendingItem } from "./quickAddQueue.ts";

type Queue = QuickAddQueue<undefined, string>;
type Batch = PendingItem<undefined>[];

const names = (queue: Queue) => queue.state.pending.map((item) => item.name);
const batchNames = (batch: Batch) => batch.map((item) => item.name);

describe("QuickAddQueue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves everything in one batch after the debounce", async () => {
    const save = vi.fn(async (batch: Batch) => batchNames(batch));
    const onSaved = vi.fn();
    const queue = new QuickAddQueue<undefined, string>({ save, onSaved, debounceMs: 3000 });

    queue.add("Socks", undefined);
    await vi.advanceTimersByTimeAsync(2000);
    queue.add("  Book  ", undefined);
    queue.add("   ", undefined);
    await vi.advanceTimersByTimeAsync(2999);
    expect(save).not.toHaveBeenCalled();
    expect(names(queue)).toEqual(["Socks", "Book"]);

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledOnce();
    expect(batchNames(save.mock.calls[0]![0])).toEqual(["Socks", "Book"]);
    expect(onSaved).toHaveBeenCalledWith(["Socks", "Book"]);
    expect(queue.state).toEqual({ pending: [], retrying: false });
  });

  it("saves straight away on flush", async () => {
    const save = vi.fn(async (batch: Batch) => batchNames(batch));
    const queue = new QuickAddQueue<undefined, string>({ save });
    queue.add("Socks", undefined);
    queue.flush();
    expect(batchNames(save.mock.calls[0]![0])).toEqual(["Socks"]);
    await vi.runAllTimersAsync();
    expect(save).toHaveBeenCalledOnce();
  });

  it("retries with exponential backoff, together with items typed meanwhile", async () => {
    const save = vi
      .fn<(batch: Batch) => Promise<string[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(async (batch) => batchNames(batch));
    const queue = new QuickAddQueue<undefined, string>({ save, debounceMs: 100, retryMs: 1000 });

    queue.add("Socks", undefined);
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.state.retrying).toBe(true);

    queue.add("Book", undefined);
    await vi.advanceTimersByTimeAsync(999);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(batchNames(save.mock.lastCall![0])).toEqual(["Socks", "Book"]);

    // The second failure waits twice as long.
    await vi.advanceTimersByTimeAsync(1999);
    expect(save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(3);
    expect(queue.state).toEqual({ pending: [], retrying: false });
  });

  it("drops unsaved items and stops retrying on cancel", async () => {
    const save = vi.fn(async (_batch: Batch): Promise<string[]> =>
      Promise.reject(new Error("offline")),
    );
    const queue = new QuickAddQueue<undefined, string>({ save, debounceMs: 100, retryMs: 1000 });

    queue.add("Socks", undefined);
    await vi.advanceTimersByTimeAsync(100);
    queue.cancel();
    expect(queue.state).toEqual({ pending: [], retrying: false });
    await vi.runAllTimersAsync();
    expect(save).toHaveBeenCalledOnce();
  });

  it("drops a batch that fails after cancel", async () => {
    let reject!: (error: Error) => void;
    const save = vi.fn((_batch: Batch) => new Promise<string[]>((_, r) => (reject = r)));
    const queue = new QuickAddQueue<undefined, string>({ save });

    queue.add("Socks", undefined);
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
      .fn<(batch: Batch) => Promise<string[]>>()
      .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
      .mockImplementation(async (batch) => batchNames(batch));
    const queue = new QuickAddQueue<undefined, string>({ save, debounceMs: 100 });

    queue.add("Socks", undefined);
    queue.flush();
    queue.add("Book", undefined);
    expect(names(queue)).toEqual(["Socks", "Book"]);
    resolve(["Socks"]);
    await vi.advanceTimersByTimeAsync(100);
    expect(batchNames(save.mock.lastCall![0])).toEqual(["Book"]);
  });

  it("keeps each item's data, so a retry sends the same items again", async () => {
    const save = vi
      .fn<(batch: PendingItem<string>[]) => Promise<string[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(async (batch) => batch.map((item) => item.data));
    const queue = new QuickAddQueue<string, string>({ save, debounceMs: 100, retryMs: 1000 });

    queue.add("Socks", "id-1");
    queue.add("Book", "id-2");
    await vi.advanceTimersByTimeAsync(1100);
    expect(save.mock.calls.map(([batch]) => batch.map((item) => item.data))).toEqual([
      ["id-1", "id-2"],
      ["id-1", "id-2"],
    ]);
  });
});
