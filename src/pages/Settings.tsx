import { EditLabel } from "../components/EditLabel.tsx";
import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { Avatar } from "../components/Avatar.tsx";
import { CurrencySelect } from "../components/CurrencySelect.tsx";
import { LanguageSelect } from "../components/LanguageSelect.tsx";
import { chooseLocale } from "../lib/accountLocale.ts";
import { renameProfile } from "../lib/api/profiles.ts";
import { createChild } from "../lib/api/children.ts";
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

  const [childName, setChildName] = createSignal("");

  async function onAddChild(event: SubmitEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      await createChild(childName());
      setChildName("");
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
      <section class="card">
        <h2>{t("account.children")}</h2>
        <p class="muted small">{t("account.childrenHelp")}</p>
        <Show when={me().managed()?.length}>
          <ul class="list">
            <For each={me().managed()}>
              {(child) => (
                <li class="list-row">
                  <span class="person">
                    <Avatar id={child.id} name={child.display_name} />
                    {child.display_name}
                  </span>
                  <A class="link" href={`/children/${child.id}`}>
                    <EditLabel label={t("child.editProfile")} />
                  </A>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <form onSubmit={onAddChild}>
          <label>
            {t("group.addNewChild")}
            <input
              required
              placeholder={t("group.childName")}
              value={childName()}
              onInput={(e) => setChildName(e.currentTarget.value)}
            />
          </label>
          <button type="submit">{t("group.addChild")}</button>
        </form>
      </section>
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
