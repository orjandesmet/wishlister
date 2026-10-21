import { createResource, createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vite-plus/test";
import { isLoaded } from "./resource.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("isLoaded", () => {
  it("is false until the first load is done, and stays true while refreshing", async () => {
    let resolve!: (value: string) => void;
    const { data, refetch, dispose } = createRoot((dispose) => {
      const [data, { refetch }] = createResource(
        () => new Promise<string>((done) => (resolve = done)),
      );
      return { data, refetch, dispose };
    });
    expect(isLoaded(data)).toBe(false);
    resolve("first");
    await tick();
    expect(isLoaded(data)).toBe(true);
    void refetch();
    expect(data.loading).toBe(true);
    expect(isLoaded(data)).toBe(true);
    dispose();
  });

  it("is false while there is no source yet", () => {
    createRoot((dispose) => {
      const [source] = createSignal<string>();
      const [data] = createResource(source, async (s) => s);
      expect(isLoaded(data)).toBe(false);
      dispose();
    });
  });
});
