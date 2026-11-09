import type { Resource } from "solid-js";

/**
 * True once a resource has loaded for its current source, and while it refreshes after that.
 * Use it to hold back content that would otherwise render from `undefined` and pick the wrong branch.
 */
export const isReady = (resource: Resource<unknown>): boolean =>
  resource.state === "ready" || resource.state === "refreshing";

/**
 * The resource's value, or undefined while it loads or when it failed. Reading a failed
 * resource throws, so use this where a failure should just look like "nothing loaded".
 */
export const loaded = <T>(resource: Resource<T>): T | undefined =>
  resource.error ? undefined : resource();
