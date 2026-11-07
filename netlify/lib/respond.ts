/// <reference types="node" />
// Answers of the app's Netlify functions, logged so a failure shows its reason in
// the Netlify function log (the app only shows a short message, or nothing).
//
// Never pass a token, key or email address as text or detail: the log is kept by
// Netlify. Account and profile ids are fine.
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * A JSON answer `{ message: text }`. Answers of 400 and up are logged with `detail`
 * (what the caller doesn't need to see, like a database error): 4xx as a warning,
 * 5xx as an error.
 */
export function message(status: number, text: string, detail?: string): Response {
  if (status >= 400) {
    const line = `${status} ${text}${detail ? ` (${detail})` : ""}`;
    if (status >= 500) console.error(line);
    else console.warn(line);
  }
  return Response.json({ message: text }, { status });
}

/** The access token from "Authorization: Bearer …", if any. */
export function bearerToken(request: Request): string | undefined {
  return request.headers.get("Authorization")?.replace(/^Bearer /, "") || undefined;
}

/**
 * The signed-in user the token belongs to, or a logged 401 answer saying why not:
 * no token, an expired or revoked one, or Supabase not answering.
 */
export async function signedInUser(
  client: SupabaseClient,
  token: string | undefined,
): Promise<{ user: User } | { response: Response }> {
  if (!token) return { response: message(401, "Not signed in", "no Authorization header") };
  const { data, error } = await client.auth.getUser(token);
  if (data.user) return { user: data.user };
  const reason = error ? `${error.status ?? "?"} ${error.message}` : "no user for this token";
  return { response: message(401, "Not signed in", `checking the token failed: ${reason}`) };
}

/** Which of these environment variables aren't set, for a log line (never their values). */
export function missingEnv(...names: string[]): string {
  return names.filter((name) => !process.env[name]).join(", ") || "none";
}
