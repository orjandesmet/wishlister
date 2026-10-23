import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.",
  );
}

export const supabase = createClient(url, key, {
  auth: {
    // These are the defaults, spelled out because staying signed in depends on them: the
    // session is saved in localStorage, and the access token (1 hour) is renewed with the
    // refresh token before it runs out, also when the app comes back from the background.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
