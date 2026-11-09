import { describe, expect, it } from "vite-plus/test";
import { latestReleaseTag, pickVersion, tagsAtCommit } from "./appVersion.ts";

describe("pickVersion", () => {
  it("shows the release tag when the build is on one", () => {
    expect(pickVersion(["v0.8.0"], "ba9596c")).toBe("v0.8.0");
  });

  it("shows the short hash when the build is ahead of the last tag", () => {
    expect(pickVersion([], "ba9596c")).toBe("ba9596c");
  });

  it("ignores tags that are not releases", () => {
    expect(pickVersion(["demo", ""], "ba9596c")).toBe("ba9596c");
  });

  it("shows nothing without git", () => {
    expect(pickVersion([], undefined)).toBeUndefined();
  });
});

describe("latestReleaseTag", () => {
  it("picks the highest version, numerically", () => {
    expect(latestReleaseTag(["v0.9.0", "v0.10.0", "v0.10.0-rc.1"])).toBe("v0.10.0");
  });
});

describe("tagsAtCommit", () => {
  const lsRemote = [
    "434bea13\trefs/tags/v0.6.1",
    "ced45243\trefs/tags/v0.7.0",
    "aaaa1111\trefs/tags/v0.8.0",
    "675faeb3\trefs/tags/v0.8.0^{}",
  ].join("\n");

  it("finds lightweight tags on the commit", () => {
    expect(tagsAtCommit(lsRemote, "ced45243")).toEqual(["v0.7.0"]);
  });

  it("follows annotated tags to their commit", () => {
    expect(tagsAtCommit(lsRemote, "675faeb3")).toEqual(["v0.8.0"]);
  });

  it("finds nothing for a newer commit", () => {
    expect(tagsAtCommit(lsRemote, "ba9596c0")).toEqual([]);
  });
});
