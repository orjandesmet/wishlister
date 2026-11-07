import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerToken, message, missingEnv, signedInUser } from "./respond.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("message", () => {
  it("answers JSON and logs nothing below 400", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = message(200, "sent");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "sent" });
    expect(log).not.toHaveBeenCalled();
  });

  it("logs 4xx as a warning with the detail, which the caller doesn't get", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = message(404, "Occasion not found", "no row");
    expect(warn).toHaveBeenCalledWith("404 Occasion not found (no row)");
    expect(await response.json()).toEqual({ message: "Occasion not found" });
  });

  it("logs 5xx as an error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    message(502, "Resend said no");
    expect(error).toHaveBeenCalledWith("502 Resend said no");
  });
});

describe("bearerToken", () => {
  it("reads the token from the Authorization header", () => {
    const request = new Request("https://x.test", { headers: { Authorization: "Bearer abc" } });
    expect(bearerToken(request)).toBe("abc");
    expect(bearerToken(new Request("https://x.test"))).toBeUndefined();
  });
});

describe("signedInUser", () => {
  const client = (result: unknown) =>
    ({ auth: { getUser: vi.fn().mockResolvedValue(result) } }) as unknown as SupabaseClient;

  it("gives the user", async () => {
    const user = { id: "account-1" };
    expect(await signedInUser(client({ data: { user }, error: null }), "t")).toEqual({ user });
  });

  it("answers 401 and logs why, without the token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await signedInUser(
      client({ data: { user: null }, error: { status: 403, message: "token is expired" } }),
      "secret-token",
    );
    expect("response" in result && result.response.status).toBe(401);
    expect(warn).toHaveBeenCalledWith(
      "401 Not signed in (checking the token failed: 403 token is expired)",
    );
    expect(String(warn.mock.calls)).not.toContain("secret-token");
  });

  it("answers 401 without a token", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await signedInUser(client({}), undefined);
    expect("response" in result && result.response.status).toBe(401);
  });
});

describe("missingEnv", () => {
  it("names the unset variables only", () => {
    vi.stubEnv("SET_ONE", "value");
    vi.stubEnv("UNSET_ONE", "");
    expect(missingEnv("SET_ONE", "UNSET_ONE")).toBe("UNSET_ONE");
    expect(missingEnv("SET_ONE")).toBe("none");
  });
});
