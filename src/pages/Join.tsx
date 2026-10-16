import { A, useNavigate, useParams } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import { getJoinPreview, joinGroup } from "../lib/api/groups.ts";

/** Opened from a group's invite link: shows which group it is and lets you join. */
export default function Join() {
  const params = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [preview] = createResource(() => params.code, getJoinPreview);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

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
      <h1>Join a group</h1>
      <Show when={preview.error}>
        <p class="error">Couldn't open this invite: {preview.error.message}</p>
      </Show>
      <Show when={preview() === null}>
        <p class="muted">This invite link doesn't work anymore. Ask for a new one.</p>
        <A class="link" href="/">
          Go to my groups
        </A>
      </Show>
      <Show when={preview()}>
        {(group) => (
          <section class="card">
            <Show
              when={!group().is_member}
              fallback={
                <>
                  <p>You're already in {group().group_name}.</p>
                  <A class="link" href={`/groups/${group().group_id}`}>
                    Open {group().group_name}
                  </A>
                </>
              }
            >
              <p>
                You've been invited to <strong>{group().group_name}</strong>. Join to see everyone's
                wishlists and share yours.
              </p>
              <button type="button" disabled={busy()} onClick={onJoin}>
                {busy() ? "Joining…" : `Join ${group().group_name}`}
              </button>
            </Show>
            <Show when={error()}>
              <p class="error">{error()}</p>
            </Show>
          </section>
        )}
      </Show>
    </>
  );
}
