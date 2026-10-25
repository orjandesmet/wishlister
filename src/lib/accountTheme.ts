import type { Session } from "@supabase/supabase-js";
import { createEffect, on } from "solid-js";
import { getThemedOccasions } from "./api/occasions.ts";
import { compareNames } from "./i18n.ts";
import { today } from "./occasions.ts";
import { supabase } from "./supabase.ts";
import {
  activeOccasion,
  chosenTheme,
  isTheme,
  keepMyTheme,
  setChosenTheme,
  setKeepMyTheme,
  setOccasionNow,
  type ThemeId,
} from "./theme.ts";

/** Switches your theme and saves it on the account too, so your other devices follow. */
export async function chooseTheme(next: ThemeId) {
  setChosenTheme(next);
  await supabase.auth.updateUser({ data: { theme: next } });
}

/** Saves "always use my theme" on this device and on the account. */
export async function chooseKeepMyTheme(next: boolean) {
  setKeepMyTheme(next);
  await supabase.auth.updateUser({ data: { theme_keep_mine: next } });
}

/** Looks up which occasion's theme is due in your groups. Call it again after changing occasions. */
export async function refreshOccasionTheme() {
  const on = today();
  const occasions = await getThemedOccasions(on).catch(() => []);
  setOccasionNow(activeOccasion(occasions, on, compareNames));
}

/**
 * After signing in: takes the theme saved on the account (user metadata, like the
 * language), or saves this device's on an account that has none yet. Then looks up
 * the occasion themes of your groups.
 */
export function syncThemeWithAccount(session: () => Session | null) {
  createEffect(
    on(
      () => session()?.user,
      (user) => {
        if (!user) {
          setOccasionNow(undefined);
          return;
        }
        const theme: unknown = user.user_metadata.theme;
        const keepMine: unknown = user.user_metadata.theme_keep_mine;
        if (isTheme(theme)) {
          if (theme !== chosenTheme()) setChosenTheme(theme);
          if (typeof keepMine === "boolean" && keepMine !== keepMyTheme()) setKeepMyTheme(keepMine);
        } else if (chosenTheme() !== "default" || keepMyTheme()) {
          // This runs inside Supabase's auth callback, which can't make auth calls
          // itself without locking up, so the update waits a tick.
          setTimeout(
            () =>
              void supabase.auth.updateUser({
                data: { theme: chosenTheme(), theme_keep_mine: keepMyTheme() },
              }),
          );
        }
        // A query waits for the session too, so this waits a tick as well.
        setTimeout(() => void refreshOccasionTheme());
      },
    ),
  );
}
