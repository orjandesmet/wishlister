import { A, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { Card } from "../components/Card.tsx";
import { SecretSantaForm } from "../components/SecretSantaForm.tsx";
import { SecretSantaStatus } from "../components/SecretSantaStatus.tsx";
import { usePageTitle } from "../lib/a11y.ts";
import { createCachedResource } from "../lib/cache.ts";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { createSecretSanta } from "../lib/createSecretSanta.ts";
import { createSecretSantaStart } from "../lib/createSecretSantaStart.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, OccasionId } from "../lib/ids.ts";
import { loadGroup, loadGroupOccasions } from "../lib/loaders.ts";
import { useMe } from "../lib/me.tsx";
import { today } from "../lib/occasions.ts";
import { isReady } from "../lib/resource.ts";
import u from "../utilities.module.css";

/**
 * The Secret Santa of one occasion (/groups/:groupId/occasions/:occasionId/secret-santa):
 * the form that starts it, or, once it runs, whether you take part and who you drew, and for
 * managers who takes part, with the option to remove people.
 */
export default function SecretSantaPage() {
  const params = useParams<{ groupId: GroupId; occasionId: OccasionId }>();
  const me = useMe();
  const runner = createActionRunner();
  const [group] = createCachedResource(() => params.groupId, loadGroup);
  const [occasions] = createCachedResource(() => params.groupId, loadGroupOccasions);

  const isManager = () =>
    group()?.group_members.some((m) => m.profile_id === me().profile.id && m.role === "manager") ??
    false;
  const occasion = () => occasions()?.find((o) => o.id === params.occasionId);
  const santa = createSecretSanta(() => params.groupId, isManager, occasions, runner);
  const draw = () => santa.draws()?.find((d) => d.occasion_id === params.occasionId);

  const ready = () => isReady(group) && isReady(occasions) && isReady(santa.draws);
  const failed = () => group.error || occasions.error || santa.draws.error;
  const passed = () => (occasion()?.date ?? "") < today();

  const start = createSecretSantaStart(
    () => params.groupId,
    () => occasion()?.name ?? "",
    santa.reload,
  );
  const groupPath = () => `/groups/${params.groupId}`;
  const title = () =>
    occasion()
      ? t("secretSanta.pageTitle", { occasion: occasion()!.name })
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
          when={draw()}
          fallback={
            <Show
              when={isManager() && occasion() && !passed()}
              fallback={
                <p class={u.muted}>
                  {!occasion() || passed()
                    ? t("secretSanta.occasionGone")
                    : isManager()
                      ? ""
                      : t("secretSanta.none")}
                </p>
              }
            >
              <Card>
                <SecretSantaForm
                  occasion={occasion()!}
                  candidates={start.candidates() ?? []}
                  busy={start.busy()}
                  error={start.error()}
                  cancelHref={groupPath()}
                  onSubmit={start.onStart}
                />
              </Card>
            </Show>
          }
        >
          {(d) => (
            <SecretSantaStatus
              draw={d()}
              isManager={isManager()}
              participants={santa.participants()?.get(d().id) ?? []}
              onRemove={santa.onRemove}
            />
          )}
        </Show>
      </Show>
    </>
  );
}
