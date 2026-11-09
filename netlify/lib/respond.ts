/// <reference types="node" />
// Answers of the app's Netlify functions, logged so a failure shows its reason in
// the Netlify function log (the app only shows a short message, or nothing).
//
// Never pass a token, key or email address as text or detail: the log is kept by
// Netlify. Account and profile ids are fine.

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
 * An environment variable's value, or undefined when it's empty or `-`. Netlify can't
 * give a variable an empty value for one branch, so `-` means "not set here" (the demo
 * site sets keys like RESEND_API_KEY to `-` to turn that feature off).
 */
export function envValue(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[name];
  return value && value !== "-" ? value : undefined;
}

/** Which of these environment variables aren't set, for a log line (never their values). */
export function missingEnv(...names: string[]): string {
  return names.filter((name) => !envValue(name)).join(", ") || "none";
}

/**
 * The values of these environment variables, or which of them aren't set (for a log
 * line, never their values).
 */
export function requireEnv<const N extends string>(
  ...names: N[]
): { env: Record<N, string> } | { missing: string } {
  const missing = names.filter((name) => !envValue(name));
  if (missing.length > 0) return { missing: missing.join(", ") };
  return {
    env: Object.fromEntries(names.map((name) => [name, envValue(name)])) as Record<N, string>,
  };
}
