/** An item typed in quick add that isn't saved yet. */
export type PendingItem = {
  /** Stays the same while the item is pending, for keyed lists. */
  key: number;
  name: string;
};

export type QuickAddState = {
  pending: PendingItem[];
  /** The last save failed and a retry is scheduled. */
  retrying: boolean;
};

export type QuickAddOptions<T> = {
  /** Saves the names in one go and returns what was saved. */
  save: (names: string[]) => Promise<T[]>;
  /** Called with the saved rows, before they leave `pending`. */
  onSaved?: (saved: T[]) => void;
  /** Wait this long after the last item before saving. */
  debounceMs?: number;
  /** First retry delay; it doubles after every failure, up to `maxRetryMs`. */
  retryMs?: number;
  maxRetryMs?: number;
};

/**
 * Collects names typed in quick add and saves them in batches: a few seconds
 * after the last one, or straight away on `flush()`. A failed save retries with
 * exponential backoff until it works or `cancel()` drops the unsaved items.
 *
 * Plain TypeScript (no Solid), so it can be tested with fake timers.
 */
export class QuickAddQueue<T> {
  private waiting: PendingItem[] = [];
  private inFlight: PendingItem[] = [];
  private failures = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private nextKey = 0;
  /** Goes up on `cancel()`, so a save that was already running can't restart retries. */
  private generation = 0;
  private listeners = new Set<(state: QuickAddState) => void>();
  private savedListeners = new Set<(saved: T[]) => void>();

  private options: QuickAddOptions<T>;

  constructor(options: QuickAddOptions<T>) {
    this.options = options;
    if (options.onSaved) this.savedListeners.add(options.onSaved);
  }

  get state(): QuickAddState {
    return { pending: [...this.inFlight, ...this.waiting], retrying: this.failures > 0 };
  }

  /** Calls `listener` on every change; returns a function that stops it. */
  subscribe(listener: (state: QuickAddState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Calls `listener` with the rows of every successful save. */
  onSaved(listener: (saved: T[]) => void): () => void {
    this.savedListeners.add(listener);
    return () => this.savedListeners.delete(listener);
  }

  add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.waiting.push({ key: this.nextKey++, name: trimmed });
    // While retrying, new items join the batch the retry timer will send.
    if (this.failures === 0) this.schedule(this.options.debounceMs ?? 3000);
    this.emit();
  }

  /** Saves everything waiting now, e.g. when leaving the page. */
  flush() {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.inFlight.length > 0 || this.waiting.length === 0) return;
    const batch = this.waiting;
    this.waiting = [];
    this.inFlight = batch;
    this.emit();
    const generation = this.generation;
    this.options.save(batch.map((item) => item.name)).then(
      (saved) => {
        this.failures = 0;
        for (const listener of this.savedListeners) listener(saved);
        this.inFlight = [];
        // Items typed while saving get their own debounce.
        if (this.waiting.length > 0) this.schedule(this.options.debounceMs ?? 3000);
        this.emit();
      },
      () => {
        if (generation !== this.generation) {
          // Cancelled while this batch was being sent: drop it too.
          this.inFlight = [];
          this.emit();
          return;
        }
        this.failures++;
        // Put the batch back in front of anything typed meanwhile, in typing order.
        this.waiting = [...this.inFlight, ...this.waiting];
        this.inFlight = [];
        const first = this.options.retryMs ?? 2000;
        const max = this.options.maxRetryMs ?? 60_000;
        this.schedule(Math.min(first * 2 ** (this.failures - 1), max));
        this.emit();
      },
    );
  }

  /** Stops retrying and drops the items that aren't saved. */
  cancel() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.waiting = [];
    this.failures = 0;
    this.generation++;
    this.emit();
  }

  private schedule(ms: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), ms);
  }

  private emit() {
    const state = this.state;
    for (const listener of this.listeners) listener(state);
  }
}
