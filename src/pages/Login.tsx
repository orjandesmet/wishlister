import { useNavigate, useSearchParams } from "@solidjs/router";
import { createEffect, createSignal, Match, Show, Switch } from "solid-js";
import { LanguageSelect } from "../components/LanguageSelect.tsx";
import { focusSoon, usePageTitle } from "../lib/a11y.ts";
import { useAuth } from "../lib/auth.tsx";
import { chooseLocale } from "../lib/accountLocale.ts";
import { locale, t } from "../lib/i18n.ts";
import { supabase } from "../lib/supabase.ts";

/**
 * Passwordless login. Supabase emails a link and a one-time code.
 * The code matters on phones: a link opens in the default browser, while the
 * app may be installed on the home screen, which keeps its own login.
 */
export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams<{ next?: string }>();
  // Where to go after signing in, such as an invite link. Only paths inside the app.
  const next = () => {
    const path = searchParams.next;
    return path?.startsWith("/") && !path.startsWith("//") ? path : "/";
  };

  const [step, setStep] = createSignal<"email" | "code">("email");
  const [email, setEmail] = createSignal("");
  const [code, setCode] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();
  usePageTitle(() => t("login.signIn"));
  // Each step swaps the form, so focus follows to its field instead of dropping to the page.
  let emailInput: HTMLInputElement | undefined;
  let codeInput: HTMLInputElement | undefined;
  const goTo = (next: "email" | "code") => {
    setStep(next);
    focusSoon(() => (next === "email" ? emailInput : codeInput));
  };

  createEffect(() => {
    if (session()) navigate(next(), { replace: true });
  });

  async function sendEmail(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase.auth.signInWithOtp({
      email: email().trim(),
      options: {
        emailRedirectTo: window.location.origin + next(),
        // Saved on a new account, so its first email (and the app) speak this language.
        data: { locale: locale() },
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else goTo("code");
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
    // On success the auth listener updates the session and the effect above navigates on.
    if (error) setError(error.message);
  }

  return (
    <main class="card center" style={{ width: "100%" }}>
      <h1>Wishlister</h1>
      <Switch>
        <Match when={step() === "email"}>
          <p class="muted">{t("login.intro")}</p>
          <form onSubmit={sendEmail}>
            <label>
              {t("login.email")}
              <input
                ref={(el) => (emailInput = el)}
                type="email"
                autocomplete="email"
                required
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
            </label>
            <button type="submit" disabled={busy()}>
              {busy() ? t("login.sending") : t("login.send")}
            </button>
          </form>
        </Match>
        <Match when={step() === "code"}>
          <p>{t("login.checkInbox", { email: email() })}</p>
          <form onSubmit={verifyCode}>
            <label>
              {t("login.code")}
              <input
                ref={(el) => (codeInput = el)}
                class="code-input"
                inputmode="numeric"
                autocomplete="one-time-code"
                required
                value={code()}
                onInput={(e) => setCode(e.currentTarget.value)}
              />
            </label>
            <button type="submit" disabled={busy()}>
              {busy() ? t("login.checking") : t("login.signIn")}
            </button>
            <button type="button" class="secondary" onClick={() => goTo("email")}>
              {t("login.otherEmail")}
            </button>
          </form>
        </Match>
      </Switch>
      <Show when={error()}>
        <p class="error" role="alert">
          {error()}
        </p>
      </Show>
      <LanguageSelect value={locale()} onChange={(next) => void chooseLocale(next)} />
    </main>
  );
}
