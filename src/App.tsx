import { Navigate, Route, Router, useLocation, useParams } from "@solidjs/router";
import { createEffect, on, Show, type Component, type ParentComponent } from "solid-js";
import { TabBar } from "./components/TabBar.tsx";
import { InstallBanner } from "./components/InstallBanner.tsx";
import { focusHeading } from "./lib/a11y.ts";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import { syncLocaleWithAccount } from "./lib/accountLocale.ts";
import { syncThemeWithAccount } from "./lib/accountTheme.ts";
import { t } from "./lib/i18n.ts";
import { dismiss, install, installOffer } from "./lib/install.ts";
import { MeProvider, useMe } from "./lib/me.tsx";
import ChildSettings from "./pages/ChildSettings.tsx";
import GroupSettings from "./pages/GroupSettings.tsx";
import Home from "./pages/Home.tsx";
import Join from "./pages/Join.tsx";
import ItemForm from "./pages/ItemForm.tsx";
import Login from "./pages/Login.tsx";
import NewGroup from "./pages/NewGroup.tsx";
import Settings from "./pages/Settings.tsx";
import Unfollow from "./pages/Unfollow.tsx";
import WishList from "./pages/WishList.tsx";
import u from "./utilities.module.css";

function Tabs() {
  const me = useMe();
  return <TabBar myProfileId={me().profile.id} />;
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
    <Show
      when={!loading()}
      fallback={<p class={`${u.center} ${u.muted}`}>{t("common.loading")}</p>}
    >
      <Show when={session()} fallback={<Navigate href={login()} />}>
        <MeProvider>
          <main class="page">{props.children}</main>
          <Tabs />
        </MeProvider>
      </Show>
    </Show>
  );
};

/**
 * Builds a page afresh when its route param changes. The router reuses the page otherwise, and its
 * resources would keep showing the previous list or group until the new one has loaded.
 */
function freshPer(param: string, Page: Component): Component {
  return () => {
    const params = useParams();
    return (
      <Show when={params[param]} keyed>
        <Page />
      </Show>
    );
  };
}

/** Follows the language and theme saved on the account once someone signs in. */
function AccountSync() {
  const { session } = useAuth();
  syncLocaleWithAccount(session);
  syncThemeWithAccount(session);
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

/** Around every page: the session, the account's language and theme, and the install banner. */
export const AppRoot: ParentComponent = (props) => (
  <AuthProvider>
    <AccountSync />
    <InstallOffer />
    {props.children}
  </AuthProvider>
);

/** Every page by its path. The Screens stories render these in a memory router. */
export const AppRoutes = () => (
  <>
    <Route path="/login" component={Login} />
    <Route path="/unfollow/:token" component={Unfollow} />
    <Route component={SignedIn}>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      {/* The old account page. */}
      <Route path="/mine" component={() => <Navigate href="/settings" />} />
      <Route path="/groups/new" component={NewGroup} />
      <Route path="/groups/:groupId" component={freshPer("groupId", GroupSettings)} />
      <Route path="/children/:profileId" component={freshPer("profileId", ChildSettings)} />
      <Route path="/lists/:profileId" component={freshPer("profileId", WishList)} />
      <Route path="/lists/:profileId/items/new" component={freshPer("profileId", ItemForm)} />
      <Route path="/items/:itemId/edit" component={freshPer("itemId", ItemForm)} />
      <Route path="/join/:code" component={freshPer("code", Join)} />
    </Route>
    <Route path="*" component={() => <Navigate href="/" />} />
  </>
);

function App() {
  return (
    <Router root={AppRoot}>
      <AppRoutes />
    </Router>
  );
}

export default App;
