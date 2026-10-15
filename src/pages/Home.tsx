import { createResource, Show } from "solid-js";
import { useAuth } from "../lib/auth.tsx";
import { supabase } from "../lib/supabase.ts";

async function fetchMyProfile(accountId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("account_id", accountId)
    .single();
  if (error) throw error;
  return data;
}

export default function Home() {
  const { session } = useAuth();
  // Re-fetches automatically whenever the signed-in account changes.
  const [profile] = createResource(() => session()?.user.id, fetchMyProfile);

  return (
    <>
      <header>
        <h1>My groups</h1>
      </header>
      <section class="card">
        <Show
          when={profile()}
          fallback={
            <p class="muted">{profile.error ? "Couldn't load your profile." : "Loading…"}</p>
          }
        >
          {(p) => <p>Hi {p().display_name}, you're signed in.</p>}
        </Show>
        <p class="muted">Your groups and wishlists arrive in the next step.</p>
        <button type="button" class="secondary" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </button>
      </section>
    </>
  );
}
