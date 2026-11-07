import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { callFunction, FunctionError } from "./functions.ts";
import { nudgeFailure } from "./secretSanta.ts";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));
vi.mock("../supabase.ts", () => ({ supabase: { auth } }));

const session = (token: string) => ({ data: { session: { access_token: token } } });
const answer = (status: number, body: unknown = {}) => Response.json(body, { status });
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  auth.getSession.mockResolvedValue(session("old"));
  auth.refreshSession.mockResolvedValue(session("new"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

const tokenOf = (call: number) =>
  (fetchMock.mock.calls[call][1]!.headers as Record<string, string>).Authorization;

describe("callFunction", () => {
  it("sends the saved access token", async () => {
    fetchMock.mockResolvedValueOnce(answer(200, { message: "sent" }));
    await expect(callFunction("nudge", "failed")).resolves.toEqual({
      message: "sent",
      status: 200,
    });
    expect(tokenOf(0)).toBe("Bearer old");
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });

  it("renews the session once on a 401 and tries again", async () => {
    fetchMock.mockResolvedValueOnce(answer(401)).mockResolvedValueOnce(answer(200));
    await expect(callFunction("nudge", "failed")).resolves.toMatchObject({ status: 200 });
    expect(tokenOf(1)).toBe("Bearer new");
  });

  it("throws a translated message when still not signed in", async () => {
    auth.refreshSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValueOnce(answer(401, { message: "Not signed in" }));
    const error = await callFunction("nudge", "failed").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FunctionError);
    expect((error as FunctionError).status).toBe(401);
    expect((error as FunctionError).message).not.toBe("Not signed in");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns allowed statuses and throws others with the function's message", async () => {
    fetchMock.mockResolvedValueOnce(answer(503));
    await expect(callFunction("nudge", "failed", {}, [503])).resolves.toMatchObject({
      status: 503,
    });
    fetchMock.mockResolvedValueOnce(answer(429, { message: "too soon" }));
    await expect(callFunction("nudge", "failed")).rejects.toMatchObject({
      status: 429,
      message: "too soon",
    });
  });
});

describe("nudgeFailure", () => {
  it("translates by status, never showing the server's English text", () => {
    for (const status of [401, 404, 409, 429, 500, 502]) {
      const text = nudgeFailure(new FunctionError("server text", status));
      expect(text).not.toBe("server text");
      expect(text).not.toMatch(/^secretSanta\.|^common\./);
    }
    expect(nudgeFailure(new TypeError("Failed to fetch"))).not.toBe("Failed to fetch");
  });
});
