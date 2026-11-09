import { createResource, createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vite-plus/test";
import { isReady, loaded } from "./resource.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("isReady", () => {
  it("is false until the first load is done, and stays true while refreshing", async () => {
    let resolve!: (value: string) => void;
    const { data, refetch, dispose } = createRoot((dispose) => {
      const [data, { refetch }] = createResource(
        () => new Promise<string>((done) => (resolve = done)),
      );
      return { data, refetch, dispose };
    });
    expect(isReady(data)).toBe(false);
    resolve("first");
    await tick();
    expect(isReady(data)).toBe(true);
    void refetch();
    expect(data.loading).toBe(true);
    expect(isReady(data)).toBe(true);
    dispose();
  });

  it("is false while there is no source yet", () => {
    createRoot((dispose) => {
      const [source] = createSignal<string>();
      const [data] = createResource(source, async (s) => s);
      expect(isReady(data)).toBe(false);
      dispose();
    });
  });
});

describe("loaded", () => {
  it("is the value once loaded", async () => {
    const { data, dispose } = createRoot((dispose) => {
      const [data] = createResource(async () => "value");
      return { data, dispose };
    });
    expect(loaded(data)).toBeUndefined();
    await tick();
    expect(loaded(data)).toBe("value");
    dispose();
  });

  it("is undefined instead of throwing when loading failed", async () => {
    const { data, dispose } = createRoot((dispose) => {
      const [data] = createResource(async (): Promise<string> => {
        throw new Error("offline");
      });
      return { data, dispose };
    });
    await tick();
    expect(data.error).toBeInstanceOf(Error);
    expect(() => data()).toThrow();
    expect(loaded(data)).toBeUndefined();
    dispose();
  });
});
