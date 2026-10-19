import { describe, expect, it } from "vite-plus/test";
import { parseJoinCode } from "./joinCode.ts";

const code = "3f2a9c0d4b6e4f1a8c7d2e5b9a0f1c3d";

describe("parseJoinCode", () => {
  it("takes a bare code, ignoring spaces and capitals", () => {
    expect(parseJoinCode(code)).toBe(code);
    expect(parseJoinCode(`  ${code.toUpperCase()}\n`)).toBe(code);
  });

  it("takes the code out of an invite link", () => {
    expect(parseJoinCode(`https://wishlister.example/join/${code}`)).toBe(code);
    expect(parseJoinCode(`https://wishlister.example/join/${code}/?x=1#top`)).toBe(code);
    expect(parseJoinCode(`Join us: https://wishlister.example/join/${code}`)).toBe(code);
  });

  it("returns null when there's no code", () => {
    expect(parseJoinCode("")).toBeNull();
    expect(parseJoinCode("   ")).toBeNull();
    expect(parseJoinCode("https://wishlister.example/groups")).toBeNull();
    expect(parseJoinCode("not a code")).toBeNull();
  });
});
