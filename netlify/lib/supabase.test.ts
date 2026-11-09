import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const getUser = vi.fn();
const createClient = vi.fn((..._args: unknown[]) => ({ auth: { getUser } }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const { adminClient, readSupabaseKeys, signedInCaller, supabaseKeys } =
  await import("./supabase.ts");

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function stubKeys(secretKey = "sb_secret") {
  vi.stubEnv("VITE_SUPABASE_URL", "https://db.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable");
  vi.stubEnv("SUPABASE_SECRET_KEY", secretKey);
}

describe("supabaseKeys", () => {
  it("reads the three keys", () => {
    stubKeys();
    const keys = {
      url: "https://db.test",
      publishableKey: "sb_publishable",
      secretKey: "sb_secret",
    };
    expect(readSupabaseKeys()).toEqual({ keys });
    expect(supabaseKeys()).toEqual({ keys });
  });

  it("answers 500 and logs which are missing, not their values", async () => {
    stubKeys("");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = supabaseKeys("Not set up");
    expect(readSupabaseKeys()).toEqual({ missing: "SUPABASE_SECRET_KEY" });
    expect("response" in result && result.response.status).toBe(500);
    expect("response" in result && (await result.response.json())).toEqual({
      message: "Not set up",
    });
    expect(error).toHaveBeenCalledWith("500 Not set up (missing SUPABASE_SECRET_KEY)");
    expect(String(error.mock.calls)).not.toContain("sb_publishable");
  });
});

describe("adminClient", () => {
  it("uses the secret key without a session", () => {
    adminClient("https://db.test", "sb_secret");
    expect(createClient).toHaveBeenCalledWith("https://db.test", "sb_secret", {
      auth: { persistSession: false },
    });
  });
});

describe("signedInCaller", () => {
  const keys = { url: "https://db.test", publishableKey: "sb_publishable" };
  const request = (headers: Record<string, string> = {}) =>
    new Request("https://x.test", { method: "POST", headers });

  it("gives the user and a client that acts as them", async () => {
    const user = { id: "account-1" };
    getUser.mockResolvedValue({ data: { user }, error: null });
    const result = await signedInCaller(request({ Authorization: "Bearer abc" }), keys);
    expect(result).toEqual({ user, asCaller: { auth: { getUser } } });
    expect(getUser).toHaveBeenCalledWith("abc");
    expect(createClient).toHaveBeenCalledWith("https://db.test", "sb_publishable", {
      global: { headers: { Authorization: "Bearer abc" } },
      auth: { persistSession: false },
    });
  });

  it("answers 401 without asking Supabase when there's no token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await signedInCaller(request(), keys);
    expect("response" in result && result.response.status).toBe(401);
    expect(warn).toHaveBeenCalledWith("401 Not signed in (no Authorization header)");
    expect(getUser).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("answers 401 and logs why, without the token, when Supabase doesn't accept it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 403, message: "token is expired" },
    });
    const result = await signedInCaller(request({ Authorization: "Bearer secret-token" }), keys);
    expect("response" in result && result.response.status).toBe(401);
    expect(warn).toHaveBeenCalledWith(
      "401 Not signed in (checking the token failed: 403 token is expired)",
    );
    expect(String(warn.mock.calls)).not.toContain("secret-token");
  });

  it("answers 401 when there's no user for the token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await signedInCaller(request({ Authorization: "Bearer abc" }), keys);
    expect("response" in result && result.response.status).toBe(401);
    expect(warn).toHaveBeenCalledWith(
      "401 Not signed in (checking the token failed: no user for this token)",
    );
  });
});
