import { A, Navigate, Route, Router, useLocation } from "@solidjs/router";
import { Show, type ParentComponent } from "solid-js";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import { MeProvider, useMe } from "./lib/me.tsx";
import GroupSettings from "./pages/GroupSettings.tsx";
import Home from "./pages/Home.tsx";
import Join from "./pages/Join.tsx";
import ItemForm from "./pages/ItemForm.tsx";
import Login from "./pages/Login.tsx";
import MyLists from "./pages/MyLists.tsx";
import WishList from "./pages/WishList.tsx";

/** Bottom navigation. Without children to look after, "My list" opens your own list directly. */
function Tabs() {
  const me = useMe();
  const hasChildren = () => (me().managed()?.length ?? 0) > 0;
  return (
    <nav class="tabs">
      <A href="/" end>
        Groups
      </A>
      <Show when={hasChildren()} fallback={<A href={`/lists/${me().profile.id}`}>My list</A>}>
        <A href="/mine">My lists</A>
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
  return (
    <Show when={!loading()} fallback={<p class="center muted">Loading…</p>}>
      <Show when={session()} fallback={<Navigate href={login()} />}>
        <MeProvider>
          <main class="page">{props.children}</main>
          <Tabs />
        </MeProvider>
      </Show>
    </Show>
  );
};

function App() {
  return (
    <Router root={(props) => <AuthProvider>{props.children}</AuthProvider>}>
      <Route path="/login" component={Login} />
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
