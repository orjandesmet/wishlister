import { A, useNavigate, useParams } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import { usePageTitle } from "../lib/a11y.ts";
import { getJoinPreview, joinGroup } from "../lib/api/groups.ts";
import { t } from "../lib/i18n.ts";

/** Opened from a group's invite link: shows which group it is and lets you join. */
export default function Join() {
  const params = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [preview] = createResource(() => params.code, getJoinPreview);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();
  usePageTitle(() => t("join.title"));

  async function onJoin() {
    setBusy(true);
    setError(undefined);
    try {
      const groupId = await joinGroup(params.code);
      navigate(`/groups/${groupId}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>{t("join.title")}</h1>
      <Show when={preview.error}>
        <p class="error" role="alert">
          {t("join.openFailed", { message: preview.error.message })}
        </p>
      </Show>
      <Show when={preview() === null}>
        <p class="muted">{t("join.expired")}</p>
        <A class="link" href="/">
          {t("join.toGroups")}
        </A>
      </Show>
      <Show when={preview()}>
        {(group) => (
          <section class="card">
            <Show
              when={!group().is_member}
              fallback={
                <>
                  <p>{t("join.alreadyIn", { group: group().group_name })}</p>
                  <A class="link" href={`/groups/${group().group_id}`}>
                    {t("join.open", { group: group().group_name })}
                  </A>
                </>
              }
            >
              <p>{t("join.invited", { group: group().group_name })}</p>
              <button type="button" disabled={busy()} onClick={onJoin}>
                {busy() ? t("join.joining") : t("join.join", { group: group().group_name })}
              </button>
            </Show>
            <Show when={error()}>
              <p class="error" role="alert">
                {error()}
              </p>
            </Show>
          </section>
        )}
      </Show>
    </>
  );
}
