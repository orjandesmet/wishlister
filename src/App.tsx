import { A, Navigate, Route, Router } from "@solidjs/router";
import { Show, type ParentComponent } from "solid-js";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import { MeProvider } from "./lib/me.tsx";
import GroupSettings from "./pages/GroupSettings.tsx";
import Home from "./pages/Home.tsx";
import ItemForm from "./pages/ItemForm.tsx";
import Login from "./pages/Login.tsx";
import MyLists from "./pages/MyLists.tsx";
import WishList from "./pages/WishList.tsx";

/** Layout route for signed-in pages: guards them and adds the bottom navigation. */
const SignedIn: ParentComponent = (props) => {
  const { session, loading } = useAuth();
  return (
    <Show when={!loading()} fallback={<p class="center muted">Loading…</p>}>
      <Show when={session()} fallback={<Navigate href="/login" />}>
        <MeProvider>
          <main class="page">{props.children}</main>
          <nav class="tabs">
            <A href="/" end>
              Groups
            </A>
            <A href="/mine">My lists</A>
          </nav>
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
      </Route>
      <Route path="*" component={() => <Navigate href="/" />} />
    </Router>
  );
}

export default App;
