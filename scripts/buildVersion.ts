import { execFileSync } from "node:child_process";
import { pickVersion, tagsAtCommit } from "../src/lib/appVersion.ts";

function git(...args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim();
  } catch {
    return undefined;
  }
}

/**
 * The version for this build: the release tag (v0.8.0) when the commit is
 * exactly on one, otherwise the short commit hash. Undefined without git.
 *
 * Netlify builds from a shallow clone that may have no tags, so when the clone
 * has none at all the tags are read from the remote instead. That only lists
 * names and commits, it downloads nothing.
 */
export function buildVersion(): string | undefined {
  const head = git("rev-parse", "HEAD") ?? process.env.COMMIT_REF;
  if (!head) return undefined;
  const shortHash = git("rev-parse", "--short", head) ?? head.slice(0, 7);

  const hasLocalTags = Boolean(git("tag", "--list", "v*"));
  const tagsAtHead = hasLocalTags
    ? (git("tag", "--points-at", head) ?? "").split("\n")
    : tagsAtCommit(git("ls-remote", "--tags", "origin") ?? "", head);
  return pickVersion(tagsAtHead, shortHash);
}
