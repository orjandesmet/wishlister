import { A, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { Card } from "../components/Card.tsx";
import { SecretSantaForm } from "../components/secret-santa/SecretSantaForm.tsx";
import { SecretSantaStatus } from "../components/secret-santa/SecretSantaStatus.tsx";
import { usePageTitle } from "../lib/a11y.ts";
import { createCachedResource } from "../lib/cache.ts";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { createSecretSanta } from "../lib/createSecretSanta.ts";
import { createSecretSantaStart } from "../lib/createSecretSantaStart.ts";
import { compareNames, t } from "../lib/i18n.ts";
import type { GroupId } from "../lib/ids.ts";
import { loadGroup, loadGroupOccasions } from "../lib/loaders.ts";
import { useMe } from "../lib/me.tsx";
import { splitOccasions, today } from "../lib/occasions.ts";
import { isReady } from "../lib/resource.ts";
import u from "../utilities.module.css";

/**
 * A group's Secret Santa (/groups/:groupId/secret-santa). A group has one running at a time:
 * managers start it here, picking the occasion; once it runs, this shows whether you take part
 * and who you drew, and for managers who takes part, with the option to remove people.
 */
export default function SecretSantaPage() {
  const params = useParams<{ groupId: GroupId }>();
  const me = useMe();
  const runner = createActionRunner();
  const [group] = createCachedResource(() => params.groupId, loadGroup);
  const [occasions] = createCachedResource(() => params.groupId, loadGroupOccasions);

  const isManager = () =>
    group()?.group_members.some((m) => m.profile_id === me().profile.id && m.role === "manager") ??
    false;
  const santa = createSecretSanta(() => params.groupId, isManager, occasions, runner);
  const upcoming = () => splitOccasions(occasions() ?? [], today(), compareNames).upcoming;

  const ready = () => isReady(group) && isReady(occasions) && isReady(santa.draws);
  const failed = () => group.error || occasions.error || santa.draws.error;

  const start = createSecretSantaStart(() => params.groupId, occasions, santa.reload);
  const groupPath = () => `/groups/${params.groupId}`;
  const title = () =>
    santa.runningOccasion()
      ? t("secretSanta.viewFor", { occasion: santa.runningOccasion()!.name })
      : t("secretSanta.title");
  usePageTitle(title);

  return (
    <>
      <A class={u.link} href={groupPath()}>
        {t("secretSanta.backTo", { group: group()?.name ?? t("group.fallbackTitle") })}
      </A>
      <h1>{title()}</h1>
      <Show when={failed()}>
        <p class={u.error} role="alert">
          {t("group.unavailable")}
        </p>
      </Show>
      <Show when={!ready() && !failed()}>
        <p class={u.muted}>{t("common.loading")}</p>
      </Show>
      {/* Always there, so screen readers notice when a message appears in it. */}
      <div role="status">
        <Show when={start.started()}>
          {(mail) => (
            <p class={u.notice}>
              {t(
                mail() === "sent"
                  ? "secretSanta.startedSent"
                  : mail() === "not_set_up"
                    ? "secretSanta.startedNotSetUp"
                    : "secretSanta.startedMailFailed",
              )}
            </p>
          )}
        </Show>
        <Show when={runner.notice()}>
          <p class={u.notice}>{runner.notice()}</p>
        </Show>
      </div>
      <Show when={runner.error()}>
        <p class={u.error} role="alert">
          {runner.error()}
        </p>
      </Show>
      <Show when={ready() && !failed()}>
        <Show
          when={santa.runningDraw()}
          fallback={
            <Show when={isManager()} fallback={<p class={u.muted}>{t("secretSanta.none")}</p>}>
              <Show
                when={upcoming().length > 0}
                fallback={<p class={u.muted}>{t("secretSanta.noUpcoming")}</p>}
              >
                <Card>
                  <SecretSantaForm
                    occasions={upcoming()}
                    candidates={start.candidates() ?? []}
                    busy={start.busy()}
                    error={start.error()}
                    cancelHref={groupPath()}
                    onSubmit={start.onStart}
                  />
                </Card>
              </Show>
            </Show>
          }
        >
          {(draw) => (
            <SecretSantaStatus
              draw={draw()}
              isManager={isManager()}
              participants={santa.participants()?.get(draw().id) ?? []}
              onRemove={santa.onRemove}
            />
          )}
        </Show>
      </Show>
    </>
  );
}
