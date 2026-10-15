import { Navigate, Route, Router } from "@solidjs/router";
import { Show, type ParentComponent } from "solid-js";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";

/** Layout route: renders its children only for signed-in users. */
const RequireAuth: ParentComponent = (props) => {
  const { session, loading } = useAuth();
  return (
    <Show when={!loading()} fallback={<p class="center muted">Loading…</p>}>
      <Show when={session()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  );
};

function App() {
  return (
    <Router root={(props) => <AuthProvider>{props.children}</AuthProvider>}>
      <Route path="/login" component={Login} />
      <Route component={RequireAuth}>
        <Route path="/" component={Home} />
      </Route>
      <Route path="*" component={() => <Navigate href="/" />} />
    </Router>
  );
}

export default App;
