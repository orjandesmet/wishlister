import { A, useParams } from "@solidjs/router";
import { createResource, Match, Switch } from "solid-js";
import { unfollowByToken } from "../lib/api/follows.ts";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";

/** Opened from "Stop following" in a digest email. Unfollows straight away, signed in or not. */
export default function Unfollow() {
  const params = useParams<{ token: string }>();
  const [result] = createResource(() => params.token, unfollowByToken);

  return (
    <main class="page">
      <h1>{t("unfollow.title")}</h1>
      <Switch fallback={<p class={u.muted}>{t("common.loading")}</p>}>
        <Match when={result.error}>
          <p class={u.error}>{t("unfollow.failed", { message: result.error.message })}</p>
        </Match>
        <Match when={result() === null}>
          <p>{t("unfollow.notFound")}</p>
        </Match>
        <Match when={result()}>{(name) => <p>{t("unfollow.done", { name: name() })}</p>}</Match>
      </Switch>
      <A class={u.link} href="/">
        {t("unfollow.toApp")}
      </A>
    </main>
  );
}
