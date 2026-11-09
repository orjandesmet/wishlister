/**
 * Picks the version shown at the bottom of the settings page: the release tag
 * when the build is exactly on one, otherwise the short commit hash.
 *
 * Pure so it can be tested; scripts/buildVersion.ts reads git and passes the
 * results in at build time.
 */

/** Release tags look like v0.8.0 or v1.2.3-beta.1. */
const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/;

function versionParts(tag: string): number[] {
  const match = RELEASE_TAG.exec(tag);
  return match ? match.slice(1, 4).map(Number) : [];
}

/** The highest release tag in the list, or undefined when none is a release tag. */
export function latestReleaseTag(tags: string[]): string | undefined {
  return tags
    .filter((tag) => RELEASE_TAG.test(tag))
    .sort((a, b) => {
      const [pa, pb] = [versionParts(a), versionParts(b)];
      for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
      // Same numbers: the one without a pre-release suffix wins.
      return a.length - b.length;
    })[0];
}

/**
 * Release tags pointing at `commit`, read from `git ls-remote --tags` output
 * ("<sha>\trefs/tags/<name>" lines; annotated tags add a "<name>^{}" line with
 * the commit they point at).
 */
export function tagsAtCommit(lsRemote: string, commit: string): string[] {
  const tags: string[] = [];
  for (const line of lsRemote.split("\n")) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (!sha || !ref?.startsWith("refs/tags/") || sha !== commit) continue;
    tags.push(ref.slice("refs/tags/".length).replace(/\^\{\}$/, ""));
  }
  return tags;
}

/** The release tag on the build commit, else the short hash, else nothing. */
export function pickVersion(tagsAtHead: string[], shortHash?: string): string | undefined {
  return latestReleaseTag(tagsAtHead) ?? shortHash;
}
