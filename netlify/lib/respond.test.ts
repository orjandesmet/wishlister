import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { bearerToken, message, missingEnv, requireEnv } from "./respond.ts";

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

describe("missingEnv", () => {
  it("names the unset variables only", () => {
    vi.stubEnv("SET_ONE", "value");
    vi.stubEnv("UNSET_ONE", "");
    expect(missingEnv("SET_ONE", "UNSET_ONE")).toBe("UNSET_ONE");
    expect(missingEnv("SET_ONE")).toBe("none");
  });
});

describe("requireEnv", () => {
  it("gives the values when all are set", () => {
    vi.stubEnv("A_KEY", "a");
    vi.stubEnv("B_KEY", "b");
    expect(requireEnv("A_KEY", "B_KEY")).toEqual({ env: { A_KEY: "a", B_KEY: "b" } });
  });

  it("names the missing ones, not the values", () => {
    vi.stubEnv("A_KEY", "secret-a");
    vi.stubEnv("B_KEY", "");
    expect(requireEnv("A_KEY", "B_KEY", "C_KEY")).toEqual({ missing: "B_KEY, C_KEY" });
  });
});
