import { EditLabel } from "../components/EditLabel.tsx";
import { A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { NotificationSettings } from "../components/NotificationSettings.tsx";
import { CurrencySelect } from "../components/CurrencySelect.tsx";
import { LanguageSelect } from "../components/LanguageSelect.tsx";
import { ThemeSelect } from "../components/ThemeSelect.tsx";
import { chooseLocale } from "../lib/accountLocale.ts";
import { chooseKeepMyTheme, chooseTheme } from "../lib/accountTheme.ts";
import { renameProfile } from "../lib/api/profiles.ts";
import { createChild } from "../lib/api/children.ts";
import { followList, getMyFollows, unfollowAll, unfollowList } from "../lib/api/follows.ts";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { today } from "../lib/occasions.ts";
import { displayCurrency, setDisplayCurrency } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import { chosenTheme, keepMyTheme, occasionNow } from "../lib/theme.ts";
import { useMe } from "../lib/me.tsx";
import { signOutHere } from "../lib/auth.tsx";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Person } from "../components/Person.tsx";
import { usePageTitle } from "../lib/a11y.ts";

/** Your name, language, currency and theme, the children you look after, and signing out. */
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

  const runner = createActionRunner();
  const [busy, runBusy] = runner.busyRunner();
  const [follows, { refetch: refetchFollows }] = createResource(() => getMyFollows(today()));
  const changeFollows = (action: () => Promise<void>) =>
    runBusy(async () => {
      await action();
      await refetchFollows();
    });

  usePageTitle(() => t("account.title"));

  return (
    <>
      <h1>{t("account.title")}</h1>
      <Card as="form" onSubmit={onRename}>
        <label>
          {t("account.yourName")}
          <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <button type="submit">{t("account.saveName")}</button>
        <Show when={saved()}>
          <p class={u.muted}>{t("account.saved")}</p>
        </Show>
      </Card>
      <Card>
        <LanguageSelect
          value={locale()}
          onChange={(next) => chooseLocale(next).catch((e: Error) => setError(e.message))}
        />
        <CurrencySelect value={displayCurrency()} onChange={setDisplayCurrency} />
        <ThemeSelect
          value={chosenTheme()}
          keepMine={keepMyTheme()}
          occasion={occasionNow()}
          onChange={(next) => chooseTheme(next).catch((e: Error) => setError(e.message))}
          onKeepMineChange={(next) =>
            chooseKeepMyTheme(next).catch((e: Error) => setError(e.message))
          }
        />
      </Card>
      <Card>
        <h2>{t("account.children")}</h2>
        <p class={`${u.muted} ${u.small}`}>{t("account.childrenHelp")}</p>
        <Show when={me().managed()?.length}>
          <ul class={u.list}>
            <For each={me().managed()}>
              {(child) => (
                <li class={u.listRow}>
                  <Person id={child.id} name={child.display_name} />
                  <A class={u.link} href={`/children/${child.id}`}>
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
      </Card>
      <NotificationSettings
        follows={follows() ?? []}
        today={today()}
        busy={busy()}
        onChangeDate={(id, until) => void changeFollows(() => followList(id, until))}
        onUnfollow={(id) => void changeFollows(() => unfollowList(id))}
        onUnfollowAll={() => {
          if (!confirm(t("notifications.confirmUnsubscribeAll"))) return;
          void changeFollows(() => unfollowAll(me().profile.id));
        }}
      />
      <Show when={runner.error()}>
        <p class={u.error} role="alert">
          {runner.error()}
        </p>
      </Show>
      <Show when={error()}>
        <p class={u.error} role="alert">
          {error()}
        </p>
      </Show>
      <Button variant="secondary" danger onClick={() => void signOutHere()}>
        {t("account.signOut")}
      </Button>
    </>
  );
}
