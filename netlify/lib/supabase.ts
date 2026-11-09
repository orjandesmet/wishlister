/// <reference types="node" />
// The Supabase setup the Netlify functions share: reading the keys from the
// environment, the two kinds of client, and checking who's calling.
//
// - asCaller (publishable key + the caller's token): row-level security applies,
//   so it only sees what the signed-in person may see.
// - admin (secret key): skips row-level security. Only use it after checking the
//   caller, for what the caller can't do themselves (auth admin, sending emails).
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { bearerToken, message, requireEnv } from "./respond.ts";

export type SupabaseKeys = { url: string; publishableKey: string; secretKey: string };

/** The environment variables readSupabaseKeys() needs. */
export const SUPABASE_KEY_NAMES = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

/** The Supabase url, publishable key and secret key, or which of them aren't set. */
export function readSupabaseKeys(): { keys: SupabaseKeys } | { missing: string } {
  const read = requireEnv(...SUPABASE_KEY_NAMES);
  if ("missing" in read) return read;
  // Typed by SUPABASE_KEY_NAMES, so renaming one there makes these fail to compile.
  const { env } = read;
  return {
    keys: {
      url: env.VITE_SUPABASE_URL,
      publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      secretKey: env.SUPABASE_SECRET_KEY,
    },
  };
}

/**
 * The Supabase keys, or a logged 500 answer naming the missing ones. `text` is
 * what the app gets to see.
 */
export function supabaseKeys(
  text = `Missing ${SUPABASE_KEY_NAMES.slice(0, -1).join(", ")} or ${SUPABASE_KEY_NAMES.at(-1)}`,
): { keys: SupabaseKeys } | { response: Response } {
  const read = readSupabaseKeys();
  if ("keys" in read) return read;
  return { response: message(500, text, `missing ${read.missing}`) };
}

/** A client with the secret key: no row-level security. */
export function adminClient(url: string, secretKey: string): SupabaseClient {
  return createClient(url, secretKey, { auth: { persistSession: false } });
}

/** A client that acts as the caller, so row-level security applies. */
function callerClient(url: string, publishableKey: string, token: string): SupabaseClient {
  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

/**
 * The signed-in caller of `request` ("Authorization: Bearer …") and a client acting
 * as them, or a logged 401 answer saying why not: no token, an expired or revoked
 * one, or Supabase not answering.
 */
export async function signedInCaller(
  request: Request,
  keys: { url: string; publishableKey: string },
): Promise<{ user: User; asCaller: SupabaseClient } | { response: Response }> {
  const token = bearerToken(request);
  if (!token) return { response: message(401, "Not signed in", "no Authorization header") };
  const asCaller = callerClient(keys.url, keys.publishableKey, token);
  const { data, error } = await asCaller.auth.getUser(token);
  if (data.user) return { user: data.user, asCaller };
  const reason = error ? `${error.status ?? "?"} ${error.message}` : "no user for this token";
  return { response: message(401, "Not signed in", `checking the token failed: ${reason}`) };
}
