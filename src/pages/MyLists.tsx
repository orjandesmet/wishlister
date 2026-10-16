import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { renameProfile } from "../lib/api/profiles.ts";
import { supabase } from "../lib/supabase.ts";
import { useMe } from "../lib/me.tsx";

export default function MyLists() {
  const me = useMe();
  const [name, setName] = createSignal(me().profile.display_name);
  const [saved, setSaved] = createSignal(false);
  const [error, setError] = createSignal<string>();
  const hasChildren = () => (me().managed()?.length ?? 0) > 0;

  async function onRename(event: SubmitEvent) {
    event.preventDefault();
    setError(undefined);
    setSaved(false);
    try {
      await renameProfile(me().profile.id, name());
      me().refetchProfile();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <h1>{hasChildren() ? "My lists" : "Account"}</h1>
      <Show when={hasChildren()}>
        <section class="card">
          <ul class="list">
            <li>
              <A class="list-row" href={`/lists/${me().profile.id}`}>
                <span>My wishlist</span>
                <span class="muted">›</span>
              </A>
            </li>
            <For each={me().managed()}>
              {(child) => (
                <li>
                  <A class="list-row" href={`/lists/${child.id}`}>
                    <span>{child.display_name}'s wishlist</span>
                    <span class="muted">›</span>
                  </A>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
      <form class="card" onSubmit={onRename}>
        <label>
          Your name, as others see it
          <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <button type="submit">Save name</button>
        <Show when={saved()}>
          <p class="muted">Saved.</p>
        </Show>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
      </form>
      <button type="button" class="secondary" onClick={() => void supabase.auth.signOut()}>
        Sign out
      </button>
    </>
  );
}
