/// <reference types="node" />
// The Supabase setup the Netlify functions share: reading the keys from the
// environment, the two kinds of client, and checking who's calling.
//
// - asCaller (publishable key + the caller's token): row-level security applies,
//   so it only sees what the signed-in person may see.
// - admin (secret key): skips row-level security. Only use it after checking the
//   caller, for what the caller can't do themselves (auth admin, sending emails).
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { bearerToken, message, missingEnv, signedInUser } from "./respond.ts";

export type SupabaseKeys = { url: string; publishableKey: string; secretKey: string };

/** The environment variables readSupabaseKeys() needs. */
export const SUPABASE_KEY_NAMES = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
];

/** The Supabase url, publishable key and secret key, or undefined if any isn't set. */
export function readSupabaseKeys(): SupabaseKeys | undefined {
  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) return undefined;
  return { url, publishableKey, secretKey };
}

/**
 * The Supabase keys, or a logged 500 answer naming the missing ones. `text` is
 * what the app gets to see.
 */
export function supabaseKeys(
  text = "Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY",
): { keys: SupabaseKeys } | { response: Response } {
  const keys = readSupabaseKeys();
  if (keys) return { keys };
  return { response: message(500, text, `missing ${missingEnv(...SUPABASE_KEY_NAMES)}`) };
}

/** A client with the secret key: no row-level security. */
export function adminClient(url: string, secretKey: string): SupabaseClient {
  return createClient(url, secretKey, { auth: { persistSession: false } });
}

/** A client that acts as the caller, so row-level security applies. */
export function callerClient(url: string, publishableKey: string, token: string): SupabaseClient {
  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

/**
 * The signed-in caller of `request` ("Authorization: Bearer …") and a client acting
 * as them, or a logged 401 answer: no token, or one Supabase doesn't accept.
 */
export async function signedInCaller(
  request: Request,
  keys: { url: string; publishableKey: string },
): Promise<{ user: User; asCaller: SupabaseClient } | { response: Response }> {
  const token = bearerToken(request);
  if (!token) return { response: message(401, "Not signed in", "no Authorization header") };
  const asCaller = callerClient(keys.url, keys.publishableKey, token);
  const signedIn = await signedInUser(asCaller, token);
  if ("response" in signedIn) return { response: signedIn.response };
  return { user: signedIn.user, asCaller };
}
