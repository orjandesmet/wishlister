import { EditLabel } from "../components/EditLabel.tsx";
import { A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { MyPurchases } from "../components/MyPurchases.tsx";
import { NotificationSettings } from "../components/NotificationSettings.tsx";
import { CurrencySelect } from "../components/CurrencySelect.tsx";
import { CardViewSetting } from "../components/CardViewSetting.tsx";
import { GroupCollapseSetting } from "../components/GroupCollapseSetting.tsx";
import { LanguageSelect } from "../components/LanguageSelect.tsx";
import { SeasonalThemes } from "../components/SeasonalThemes.tsx";
import { chooseLocale } from "../lib/accountLocale.ts";
import {
  renameProfile,
  setProfileCardView,
  setProfileGroupCollapse,
  setProfileSeasonalThemes,
} from "../lib/api/profiles.ts";
import { createChild } from "../lib/api/children.ts";
import { followList, getMyFollows, unfollowAll, unfollowList } from "../lib/api/follows.ts";
import { getMyPurchases, setDelivered } from "../lib/api/purchases.ts";
import type { ItemId } from "../lib/ids.ts";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { today } from "../lib/occasions.ts";
import { cardView, chooseCardView, type CardView } from "../lib/cardView.ts";
import { displayCurrency, setDisplayCurrency } from "../lib/currency.ts";
import {
  groupCollapseMode,
  setGroupCollapseMode,
  type GroupCollapseMode,
} from "../lib/groupCollapse.ts";
import { locale, t } from "../lib/i18n.ts";
import { seasonalThemes, setSeasonalThemes, themeToday } from "../lib/theme.ts";
import { useMe } from "../lib/me.tsx";
import { signOutHere } from "../lib/auth.tsx";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Person } from "../components/Person.tsx";
import { usePageTitle } from "../lib/a11y.ts";

/** Your name, language, currency, seasonal themes and how lists look, the children you look after, what you bought, and signing out. */
export default function Settings() {
  const me = useMe();
  const [name, setName] = createSignal(me().profile.display_name);
  const [saved, setSaved] = createSignal(false);
  const runner = createActionRunner();
  const { run } = runner;

  const onRename = (event: SubmitEvent) => {
    event.preventDefault();
    setSaved(false);
    void run(async () => {
      await renameProfile(me().profile.id, name());
      me().refetchProfile();
      setSaved(true);
    });
  };

  const [childName, setChildName] = createSignal("");

  const onAddChild = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      await createChild(childName());
      setChildName("");
      me().refetchManaged();
    });
  };

  // Shown at once, and put back when saving fails.
  const onSeasonalThemes = (on: boolean) =>
    run(async () => {
      setSeasonalThemes(on);
      try {
        await setProfileSeasonalThemes(me().profile.id, on);
      } catch (e) {
        setSeasonalThemes(!on);
        throw e;
      }
      me().refetchProfile();
    });

  const onGroupCollapse = (mode: GroupCollapseMode) =>
    run(async () => {
      const before = groupCollapseMode();
      setGroupCollapseMode(mode);
      try {
        await setProfileGroupCollapse(me().profile.id, mode);
      } catch (e) {
        setGroupCollapseMode(before);
        throw e;
      }
      me().refetchProfile();
    });

  const onCardView = (view: CardView) =>
    run(async () => {
      await chooseCardView(view, (next) => setProfileCardView(me().profile.id, next));
      me().refetchProfile();
    });

  const [busy, runBusy] = runner.busyRunner();
  const [follows, { refetch: refetchFollows }] = createResource(() => getMyFollows(today()));
  const changeFollows = (action: () => Promise<void>) =>
    runBusy(async () => {
      await action();
      await refetchFollows();
    });

  const [purchases] = createResource(() => me().profile.id, getMyPurchases);
  // Ticks you changed here, shown at once and put back when saving fails. Kept apart
  // from the loaded purchases so the rows (and the focused checkbox) stay as they are.
  const [ticked, setTicked] = createSignal(new Map<ItemId, boolean>());
  const tick = (itemId: ItemId, on: boolean) => setTicked((map) => new Map(map).set(itemId, on));
  const onDelivered = (itemId: ItemId, delivered: boolean) => {
    tick(itemId, delivered);
    void run(async () => {
      try {
        await setDelivered(itemId, delivered);
      } catch (e) {
        tick(itemId, !delivered);
        throw e;
      }
    });
  };

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
        <LanguageSelect value={locale()} onChange={(next) => void run(() => chooseLocale(next))} />
        <CurrencySelect value={displayCurrency()} onChange={setDisplayCurrency} />
        <SeasonalThemes
          on={seasonalThemes()}
          today={themeToday()}
          onChange={(on) => void onSeasonalThemes(on)}
        />
        <GroupCollapseSetting
          mode={groupCollapseMode()}
          onChange={(mode) => void onGroupCollapse(mode)}
        />
        <CardViewSetting view={cardView()} onChange={(view) => void onCardView(view)} />
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
      <MyPurchases
        purchases={purchases() ?? []}
        today={today()}
        isDelivered={(p) => ticked().get(p.itemId) ?? p.delivered}
        onDelivered={onDelivered}
      />
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
      <Button variant="secondary" danger onClick={() => void signOutHere()}>
        {t("account.signOut")}
      </Button>
      <Show when={import.meta.env.VITE_APP_VERSION}>
        {(version) => (
          <p class={`${u.muted} ${u.small} ${u.center}`}>
            {t("account.version", { version: version() })}
          </p>
        )}
      </Show>
    </>
  );
}
