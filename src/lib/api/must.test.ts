import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vite-plus/test";
import { must } from "./must.ts";

describe("must", () => {
  it("returns the data when there's no error", () => {
    expect(must({ data: [1, 2], error: null })).toEqual([1, 2]);
  });

  it("throws the error message", () => {
    const error = { message: "permission denied" } as PostgrestError;
    expect(() => must({ data: null, error })).toThrow("permission denied");
  });
});
