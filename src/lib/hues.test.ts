import { describe, expect, it } from "vite-plus/test";
import { hueFor } from "./hues.ts";

describe("hueFor", () => {
  it("gives the same string the same hue every time", () => {
    expect(hueFor("anna")).toBe(hueFor("anna"));
  });

  it("uses more than one hue across different strings", () => {
    const hues = new Set(["anna", "bert", "lucas", "eva", "orjan", "toys", "books"].map(hueFor));
    expect(hues.size).toBeGreaterThan(2);
  });
});
