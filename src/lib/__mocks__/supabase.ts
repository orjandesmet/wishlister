import type { Session } from "@supabase/supabase-js";

/**
 * Storybook's stand-in for the Supabase client (see sb.mock in .storybook/preview.tsx). The API
 * modules in lib/api are mocked as a whole, so only the auth calls the app makes itself are
 * answered here. Stories pick who is signed in with setMockSession.
 */

// Kept on globalThis: the story and the app may load this file as two module instances.
const state = globalThis as { storySession?: Session | null; storyOtpError?: string | null };

/**
 * Who is signed in for the next story; null to show the login page. Without a locale the
 * account has none saved, so the app keeps the language picked in the toolbar.
 */
export function setMockSession(next: { accountId: string; locale?: string } | null) {
  state.storySession = next
    ? ({
        access_token: "story",
        user: { id: next.accountId, user_metadata: { locale: next.locale } },
      } as unknown as Session)
    : null;
}

/** What verifyOtp answers, to show a wrong code on the login page. */
export function setMockOtpError(message: string | null) {
  state.storyOtpError = message;
}

const ok = { data: {}, error: null };

export const supabase = {
  auth: {
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      queueMicrotask(() => callback("INITIAL_SESSION", state.storySession ?? null));
      return { data: { subscription: { unsubscribe() {} } } };
    },
    getSession: async () => ({ data: { session: state.storySession ?? null }, error: null }),
    updateUser: async () => ok,
    signOut: async () => ok,
    signInWithOtp: async () => ok,
    verifyOtp: async () => ({
      ...ok,
      error: state.storyOtpError ? { message: state.storyOtpError } : null,
    }),
  },
};
