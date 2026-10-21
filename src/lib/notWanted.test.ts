import { describe, expect, it } from "vite-plus/test";
import { splitNotWanted } from "./notWanted.ts";

describe("splitNotWanted", () => {
  it("leaves ordinary wishes alone", () => {
    expect(splitNotWanted(" LEGO bonsai ")).toEqual({ notWanted: false, text: "LEGO bonsai" });
  });

  it("takes off a leading exclamation mark", () => {
    expect(splitNotWanted("!mugs")).toEqual({ notWanted: true, text: "mugs" });
    expect(splitNotWanted("  ! more socks")).toEqual({ notWanted: true, text: "more socks" });
  });

  it("only looks at the start", () => {
    expect(splitNotWanted("Wow!")).toEqual({ notWanted: false, text: "Wow!" });
  });

  it("works with a pasted link", () => {
    expect(splitNotWanted("!https://example.com/mug")).toEqual({
      notWanted: true,
      text: "https://example.com/mug",
    });
  });
});
