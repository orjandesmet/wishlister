import { t } from "../i18n.ts";
import { supabase } from "../supabase.ts";

/** A Netlify function answered with a status that isn't ok (and wasn't allowed). */
export class FunctionError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FunctionError";
    this.status = status;
  }
}

/**
 * Calls a Netlify function as the signed-in user. Statuses in `allowed` aren't failures:
 * they come back in `status`, with the answer's JSON.
 *
 * The access token comes from the saved session. That token can be out of date (a laptop
 * that slept through the renewal, a renewal that failed on a bad connection), and then the
 * function answers 401 while the page still shows what it loaded before. So on a 401 the
 * session is renewed once and the call tried again; only when that fails too it throws,
 * with a translated "sign in again". Any other failure throws a FunctionError with the
 * function's own `message` (or `failure`), for the caller to translate by its status.
 */
export async function callFunction<T = unknown>(
  name: string,
  failure: string,
  body?: unknown,
  allowed: number[] = [],
): Promise<T & { status: number }> {
  const { data } = await supabase.auth.getSession();
  let response = await post(name, data.session?.access_token, body);
  if (response.status === 401) {
    const { data: renewed } = await supabase.auth.refreshSession();
    if (renewed.session) response = await post(name, renewed.session.access_token, body);
  }
  const json = (await response.json().catch(() => null)) as ({ message?: string } & T) | null;
  if (response.status === 401) throw new FunctionError(t("common.signedOut"), 401);
  if (!response.ok && !allowed.includes(response.status)) {
    throw new FunctionError(json?.message ?? `${failure} (${response.status})`, response.status);
  }
  return { ...(json as T), status: response.status };
}

function post(name: string, token: string | undefined, body: unknown) {
  return fetch(`/.netlify/functions/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
}
