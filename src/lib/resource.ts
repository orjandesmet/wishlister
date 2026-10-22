import type { Resource } from "solid-js";

/**
 * True once a resource has loaded for its current source, and while it refreshes after that.
 * Use it to hold back content that would otherwise render from `undefined` and pick the wrong branch.
 */
export const isReady = (resource: Resource<unknown>): boolean =>
  resource.state === "ready" || resource.state === "refreshing";
