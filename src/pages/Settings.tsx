import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { Avatar } from "../components/Avatar.tsx";
import { CurrencySelect } from "../components/CurrencySelect.tsx";
import { LanguageSelect } from "../components/LanguageSelect.tsx";
import { chooseLocale } from "../lib/accountLocale.ts";
import { deleteChild } from "../lib/api/children.ts";
import type { Profile } from "../lib/api/profiles.ts";
import { renameProfile } from "../lib/api/profiles.ts";
import { displayCurrency, setDisplayCurrency } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import { useMe } from "../lib/me.tsx";
import { supabase } from "../lib/supabase.ts";

/** Your name, language and currency, the children you look after, and signing out. */
export default function Settings() {
  const me = useMe();
  const [name, setName] = createSignal(me().profile.display_name);
  const [saved, setSaved] = createSignal(false);
  const [error, setError] = createSignal<string>();

  async function onRename(event: SubmitEvent) {
    event.preventDefault();
    setError(undefined);
    setSaved(false);
    try {
      await renameProfile(me().profile.id, name());
      me().refetchProfile();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onDeleteChild(child: Profile) {
    setError(undefined);
    if (!confirm(t("child.confirmDelete", { name: child.display_name }))) return;
    try {
      await deleteChild(child.id);
      me().refetchManaged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <h1>{t("account.title")}</h1>
      <form class="card" onSubmit={onRename}>
        <label>
          {t("account.yourName")}
          <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <button type="submit">{t("account.saveName")}</button>
        <Show when={saved()}>
          <p class="muted">{t("account.saved")}</p>
        </Show>
      </form>
      <section class="card">
        <LanguageSelect
          value={locale()}
          onChange={(next) => chooseLocale(next).catch((e: Error) => setError(e.message))}
        />
        <CurrencySelect value={displayCurrency()} onChange={setDisplayCurrency} />
      </section>
      <Show when={me().managed()?.length}>
        <section class="card">
          <h2>{t("account.children")}</h2>
          <p class="muted small">{t("account.childrenHelp")}</p>
          <ul class="list">
            <For each={me().managed()}>
              {(child) => (
                <li class="list-row">
                  <A class="person" href={`/lists/${child.id}`}>
                    <Avatar id={child.id} name={child.display_name} />
                    {t("account.childWishlist", { name: child.display_name })}
                  </A>
                  <button
                    type="button"
                    class="link danger"
                    aria-label={t("wishlist.deleteProfile", { name: child.display_name })}
                    onClick={() => void onDeleteChild(child)}
                  >
                    {t("account.deleteProfile")}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
      <Show when={error()}>
        <p class="error" role="alert">
          {error()}
        </p>
      </Show>
      <button type="button" class="secondary danger" onClick={() => void supabase.auth.signOut()}>
        {t("account.signOut")}
      </button>
    </>
  );
}
