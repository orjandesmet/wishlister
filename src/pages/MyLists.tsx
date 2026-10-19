import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { LanguageSelect } from "../components/LanguageSelect.tsx";
import { renameProfile } from "../lib/api/profiles.ts";
import { chooseLocale } from "../lib/accountLocale.ts";
import { locale, t } from "../lib/i18n.ts";
import { supabase } from "../lib/supabase.ts";
import { useMe } from "../lib/me.tsx";

export default function MyLists() {
  const me = useMe();
  const [name, setName] = createSignal(me().profile.display_name);
  const [saved, setSaved] = createSignal(false);
  const [error, setError] = createSignal<string>();
  const hasChildren = () => (me().managed()?.length ?? 0) > 0;

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

  return (
    <>
      <h1>{hasChildren() ? t("account.myLists") : t("account.title")}</h1>
      <Show when={hasChildren()}>
        <section class="card">
          <ul class="list">
            <li>
              <A class="list-row" href={`/lists/${me().profile.id}`}>
                <span>{t("account.myWishlist")}</span>
                <span class="muted">›</span>
              </A>
            </li>
            <For each={me().managed()}>
              {(child) => (
                <li>
                  <A class="list-row" href={`/lists/${child.id}`}>
                    <span>{t("account.childWishlist", { name: child.display_name })}</span>
                    <span class="muted">›</span>
                  </A>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
      <form class="card" onSubmit={onRename}>
        <label>
          {t("account.yourName")}
          <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <button type="submit">{t("account.saveName")}</button>
        <Show when={saved()}>
          <p class="muted">{t("account.saved")}</p>
        </Show>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
      </form>
      <section class="card">
        <LanguageSelect
          value={locale()}
          onChange={(next) => chooseLocale(next).catch((e: Error) => setError(e.message))}
        />
      </section>
      <button type="button" class="secondary" onClick={() => void supabase.auth.signOut()}>
        {t("account.signOut")}
      </button>
    </>
  );
}
