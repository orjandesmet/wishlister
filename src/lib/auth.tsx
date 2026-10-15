import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
  type ParentComponent,
} from "solid-js";
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
  });
  onCleanup(() => data.subscription.unsubscribe());

  return <AuthContext.Provider value={{ session, loading }}>{props.children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
