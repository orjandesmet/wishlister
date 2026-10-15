import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, Match, Show, Switch } from "solid-js";
import { useAuth } from "../lib/auth.tsx";
import { supabase } from "../lib/supabase.ts";

/**
 * Passwordless login. Supabase emails a link and a one-time code.
 * The code matters on phones: a link opens in the default browser, while the
 * app may be installed on the home screen, which keeps its own login.
 */
export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = createSignal<"email" | "code">("email");
  const [email, setEmail] = createSignal("");
  const [code, setCode] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  createEffect(() => {
    if (session()) navigate("/", { replace: true });
  });

  async function sendEmail(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase.auth.signInWithOtp({
      email: email().trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verifyCode(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase.auth.verifyOtp({
      email: email().trim(),
      token: code().trim(),
      type: "email",
    });
    setBusy(false);
    // On success the auth listener updates the session and the effect above navigates home.
    if (error) setError(error.message);
  }

  return (
    <main class="card center" style={{ width: "100%" }}>
      <h1>Wishlister</h1>
      <Switch>
        <Match when={step() === "email"}>
          <p class="muted">Sign in with your email. We'll send you a link and a code.</p>
          <form onSubmit={sendEmail}>
            <label>
              Email address
              <input
                type="email"
                autocomplete="email"
                required
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
            </label>
            <button type="submit" disabled={busy()}>
              {busy() ? "Sending…" : "Send me a login link"}
            </button>
          </form>
        </Match>
        <Match when={step() === "code"}>
          <p>
            Check your inbox at <strong>{email()}</strong>. Tap the link, or type the code here.
          </p>
          <form onSubmit={verifyCode}>
            <label>
              Code
              <input
                class="code-input"
                inputmode="numeric"
                autocomplete="one-time-code"
                required
                value={code()}
                onInput={(e) => setCode(e.currentTarget.value)}
              />
            </label>
            <button type="submit" disabled={busy()}>
              {busy() ? "Checking…" : "Sign in"}
            </button>
            <button type="button" class="secondary" onClick={() => setStep("email")}>
              Use a different email
            </button>
          </form>
        </Match>
      </Switch>
      <Show when={error()}>
        <p class="error" role="alert">
          {error()}
        </p>
      </Show>
    </main>
  );
}
