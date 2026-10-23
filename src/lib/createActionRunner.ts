import { createSignal } from "solid-js";

/** Runs async actions for a page, keeping the latest failure (or success notice) to show. */
export function createActionRunner() {
  const [notice, setNotice] = createSignal<string>();
  const [error, setError] = createSignal<string>();

  async function run(action: () => Promise<unknown>) {
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Like `run`, but flags `busy` while the action is going. */
  function busyRunner() {
    const [busy, setBusy] = createSignal(false);
    const runBusy = async (action: () => Promise<unknown>) => {
      setBusy(true);
      await run(action);
      setBusy(false);
    };
    return [busy, runBusy] as const;
  }

  return { notice, setNotice, error, setError, run, busyRunner };
}

export type ActionRunner = ReturnType<typeof createActionRunner>;
