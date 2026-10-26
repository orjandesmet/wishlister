import { createResource, untrack, type ResourceReturn } from "solid-js";

/**
 * A small in-memory cache for what pages load, so going back to a page shows what it showed
 * last time straight away while it loads again in the background (stale-while-revalidate).
 * Nothing is saved to disk: it starts empty with every app start and is cleared on every
 * sign-in, sign-out and change to the database (see supabase.ts and auth.tsx).
 */

type Entry = { value: unknown; at: number };

/** Plenty for a family's lists; the oldest entries go first. */
const MAX_ENTRIES = 200;

const entries = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();
// Bumped by clearCache, so a load that started before a change doesn't store old data after it.
let generation = 0;

/** Forget everything, including loads still on their way. */
export function clearCache() {
  generation++;
  entries.clear();
  inFlight.clear();
}

function store(key: string, value: unknown) {
  entries.delete(key);
  entries.set(key, { value, at: Date.now() });
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
}

export type Loader<A, T> = {
  /** Loads afresh and remembers the result. Joins a load for the same thing already on its way. */
  (arg: A): Promise<T>;
  /** What the last load returned, if it's still remembered. */
  peek(arg: A): T | undefined;
  /** Starts a load in the background, unless one is on its way or the remembered one is newer than `maxAgeMs`. */
  prefetch(arg: A, maxAgeMs?: number): Promise<T | undefined>;
};

/** Wraps an API call so its results are remembered, by `name` and argument. */
export function cached<A, T>(name: string, fetcher: (arg: A) => Promise<T>): Loader<A, T> {
  const keyOf = (arg: A) => `${name}:${JSON.stringify(arg)}`;
  const load = (arg: A): Promise<T> => {
    const key = keyOf(arg);
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;
    const started = generation;
    const promise = fetcher(arg)
      .then((value) => {
        if (started === generation) store(key, value);
        return value;
      })
      .finally(() => {
        if (inFlight.get(key) === promise) inFlight.delete(key);
      });
    inFlight.set(key, promise);
    return promise;
  };
  load.peek = (arg: A) => entries.get(keyOf(arg))?.value as T | undefined;
  load.prefetch = async (arg: A, maxAgeMs = 30_000) => {
    const key = keyOf(arg);
    const entry = entries.get(key);
    if (entry && Date.now() - entry.at < maxAgeMs) return entry.value as T;
    // A background load that fails just leaves the page to load (and show the error) itself.
    return load(arg).catch(() => undefined);
  };
  return load;
}

/**
 * createResource through a Loader: starts with the remembered value when there is one (so the
 * resource is ready at once and isReady() holds), and always loads again to refresh it.
 * Pages are built afresh per route param (freshPer in App.tsx), so the first source is the one
 * that counts; later source changes behave like a plain resource.
 */
export function createCachedResource<S, T>(
  source: () => S | undefined | null | false,
  loader: Loader<S, T>,
): ResourceReturn<T, S> {
  const first = untrack(source);
  const remembered = first == null || first === false ? undefined : loader.peek(first);
  return createResource(
    source,
    loader,
    remembered === undefined ? {} : { initialValue: remembered },
  ) as ResourceReturn<T, S>;
}
