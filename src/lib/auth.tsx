import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
  type ParentComponent,
} from "solid-js";
import { isStandalone } from "./install.ts";
import { supabase } from "./supabase.ts";

type AuthState = {
  /** The current Supabase session, or null when signed out. */
  session: Accessor<Session | null>;
  /** True until Supabase has restored any session saved in the browser. */
  loading: Accessor<boolean>;
};

const AuthContext = createContext<AuthState>();

export const AuthProvider: ParentComponent = (props) => {
  const [session, setSession] = createSignal<Session | null>(null);
  const [loading, setLoading] = createSignal(true);

  // Fires once with the restored session (INITIAL_SESSION), then on every sign-in or sign-out.
  const { data } = supabase.auth.onAuthStateChange((_event, next) => {
    setSession(next);
    setLoading(false);
    if (next) keepStorage();
  });
  onCleanup(() => data.subscription.unsubscribe());

  return <AuthContext.Provider value={{ session, loading }}>{props.children}</AuthContext.Provider>;
};

/**
 * Sign out on this device only. Supabase's default (`global`) revokes the session on
 * every device, so signing out on a laptop would also sign you out on your phone.
 */
export function signOutHere() {
  return supabase.auth.signOut({ scope: "local" });
}

let storageRequested = false;

/**
 * Ask the browser not to clear our storage (and with it the saved session) when the
 * device runs low on space. Only from the installed app: browsers grant it there
 * without asking, while Firefox in a tab would show a permission prompt.
 */
function keepStorage() {
  if (storageRequested || !isStandalone()) return;
  storageRequested = true;
  navigator.storage?.persist?.().catch(() => {});
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
