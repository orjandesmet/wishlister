import { describe, expect, it } from "vite-plus/test";
import { detectLocale } from "./locale.ts";

describe("detectLocale", () => {
  it("prefers the language saved on this device", () => {
    expect(detectLocale("nl", ["en-US"])).toBe("nl");
  });

  it("ignores a saved value it doesn't know", () => {
    expect(detectLocale("fr", ["nl-BE"])).toBe("nl");
  });

  it("takes the first browser language it has, ignoring the region", () => {
    expect(detectLocale(null, ["fr-BE", "nl-BE", "en"])).toBe("nl");
    expect(detectLocale(undefined, ["EN-gb"])).toBe("en");
  });

  it("falls back to English", () => {
    expect(detectLocale(null, ["fr", "de"])).toBe("en");
    expect(detectLocale(null, [])).toBe("en");
  });
});
