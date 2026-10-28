/**
 * The demo site: a branch deploy built with VITE_DEMO=true against its own Supabase
 * project, which the "Demo" workflow wipes and reseeds every few days. Visitors sign in
 * as one of the seed people with a shared password instead of an email code.
 * Check for it with isDemo() from lib/demoMode.ts.
 */

/** Set on the seed accounts by supabase/demo/reset.sql. Public on purpose. */
export const demoPassword = "wishlister-demo";

/** The accounts from supabase/seed.sql. */
export const demoAccounts = [
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
  { name: "Carol", email: "carol@example.com" },
] as const;
