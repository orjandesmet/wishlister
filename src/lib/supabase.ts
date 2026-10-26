import { createClient } from "@supabase/supabase-js";
import { clearCache } from "./cache.ts";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.",
  );
}

/** Database functions that only read, so calling them leaves the cache alone. */
const READ_ONLY_RPCS = new Set([
  "group_for_join_code",
  "group_join_code",
  "next_shared_occasion",
  "purchase_occasions",
]);

/**
 * Any change to the database (insert, update, delete or a function that writes) makes what
 * pages remember possibly out of date, so the cache is cleared once it's done. Simpler than
 * working out which pages a change touches, and pages reload in the background anyway.
 */
async function fetchClearingCache(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const { pathname } = new URL(input instanceof Request ? input.url : input);
    const rpc = /\/rest\/v1\/rpc\/([^/]+)$/.exec(pathname)?.[1];
    if (pathname.includes("/rest/v1/") && !(rpc && READ_ONLY_RPCS.has(rpc))) clearCache();
  }
  return response;
}

export const supabase = createClient(url, key, {
  global: { fetch: fetchClearingCache },
  auth: {
    // These are the defaults, spelled out because staying signed in depends on them: the
    // session is saved in localStorage, and the access token (1 hour) is renewed with the
    // refresh token before it runs out, also when the app comes back from the background.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
