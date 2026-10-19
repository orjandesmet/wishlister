import type { Session } from "@supabase/supabase-js";
import { createEffect, on } from "solid-js";
import { isLocale } from "../i18n/locale.ts";
import { locale, setLocale, type Locale } from "./i18n.ts";
import { supabase } from "./supabase.ts";

// Picked on the login page, before there was an account to save it on.
let choseWhileSignedOut = false;

/** Switches the language and saves it on the account too, so other devices and emails follow. */
export async function chooseLocale(next: Locale) {
  setLocale(next);
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.auth.updateUser({ data: { locale: next } });
  else choseWhileSignedOut = true;
}

/**
 * Keeps the app and the account's language in step after signing in. The
 * language is kept in the account's user metadata, where Supabase's email
 * templates can read it as {{ .Data.locale }}.
 *
 * - They picked a language on the login page: save that on the account.
 * - Else the account has a language: use it here too.
 * - Else (an older account): save the one this device detected.
 */
export function syncLocaleWithAccount(session: () => Session | null) {
  createEffect(
    on(
      () => session()?.user,
      (user) => {
        if (!user) return;
        const saved: unknown = user.user_metadata.locale;
        if (isLocale(saved) && !choseWhileSignedOut) {
          if (saved !== locale()) setLocale(saved);
          return;
        }
        choseWhileSignedOut = false;
        if (saved === locale()) return;
        // This runs inside Supabase's auth callback, which can't make auth calls
        // itself without locking up, so the update waits a tick.
        setTimeout(() => void supabase.auth.updateUser({ data: { locale: locale() } }));
      },
    ),
  );
}
