import { A, Navigate, Route, Router, useLocation } from "@solidjs/router";
import { createEffect, on, Show, type ParentComponent } from "solid-js";
import { InstallBanner } from "./components/InstallBanner.tsx";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import { focusHeading } from "./lib/a11y.ts";
import { syncLocaleWithAccount } from "./lib/accountLocale.ts";
import { t } from "./lib/i18n.ts";
import { dismiss, install, installOffer } from "./lib/install.ts";
import { MeProvider, useMe } from "./lib/me.tsx";
import GroupSettings from "./pages/GroupSettings.tsx";
import Home from "./pages/Home.tsx";
import Join from "./pages/Join.tsx";
import ItemForm from "./pages/ItemForm.tsx";
import Login from "./pages/Login.tsx";
import MyLists from "./pages/MyLists.tsx";
import Unfollow from "./pages/Unfollow.tsx";
import WishList from "./pages/WishList.tsx";

/** Bottom navigation. Without children to look after, "My list" opens your own list directly. */
function Tabs() {
  const me = useMe();
  const hasChildren = () => (me().managed()?.length ?? 0) > 0;
  return (
    <nav class="tabs" aria-label={t("a11y.mainNav")}>
      <A href="/" end>
        {t("nav.groups")}
      </A>
      <Show
        when={hasChildren()}
        fallback={<A href={`/lists/${me().profile.id}`}>{t("nav.myList")}</A>}
      >
        <A href="/mine">{t("nav.myLists")}</A>
      </Show>
    </nav>
  );
}

/** Layout route for signed-in pages: guards them and adds the bottom navigation. */
const SignedIn: ParentComponent = (props) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  // Remember where they were going (an invite link, say) to come back after signing in.
  const login = () => `/login?next=${encodeURIComponent(location.pathname)}`;
  // After following a link, a screen reader (and Tab) starts at the new page's heading,
  // like after a full page load. Waits a frame, so the new page has rendered.
  createEffect(
    on(
      () => location.pathname,
      () => requestAnimationFrame(focusHeading),
      { defer: true },
    ),
  );
  return (
    <Show when={!loading()} fallback={<p class="center muted">{t("common.loading")}</p>}>
      <Show when={session()} fallback={<Navigate href={login()} />}>
        <MeProvider>
          <main class="page">{props.children}</main>
          <Tabs />
        </MeProvider>
      </Show>
    </Show>
  );
};

/** Follows the language saved on the account once someone signs in. */
function LocaleSync() {
  syncLocaleWithAccount(useAuth().session);
  return null;
}

/** Shown above every page, signed in or not, until it's dismissed or the app is installed. */
function InstallOffer() {
  return (
    <Show when={installOffer()}>
      {(mode) => (
        <InstallBanner mode={mode()} onInstall={() => void install()} onDismiss={dismiss} />
      )}
    </Show>
  );
}

function App() {
  return (
    <Router
      root={(props) => (
        <AuthProvider>
          <LocaleSync />
          <InstallOffer />
          {props.children}
        </AuthProvider>
      )}
    >
      <Route path="/login" component={Login} />
      <Route path="/unfollow/:token" component={Unfollow} />
      <Route component={SignedIn}>
        <Route path="/" component={Home} />
        <Route path="/mine" component={MyLists} />
        <Route path="/groups/:groupId" component={GroupSettings} />
        <Route path="/lists/:profileId" component={WishList} />
        <Route path="/lists/:profileId/items/new" component={ItemForm} />
        <Route path="/items/:itemId/edit" component={ItemForm} />
        <Route path="/join/:code" component={Join} />
      </Route>
      <Route path="*" component={() => <Navigate href="/" />} />
    </Router>
  );
}

export default App;
