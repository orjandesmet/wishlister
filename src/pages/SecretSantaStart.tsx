import { A, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { Card } from "../components/Card.tsx";
import { SecretSantaForm } from "../components/SecretSantaForm.tsx";
import { usePageTitle } from "../lib/a11y.ts";
import { createCachedResource } from "../lib/cache.ts";
import { createSecretSantaStart } from "../lib/createSecretSantaStart.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, OccasionId } from "../lib/ids.ts";
import { loadGroup, loadGroupOccasions, loadSecretSantas } from "../lib/loaders.ts";
import { useMe } from "../lib/me.tsx";
import { today } from "../lib/occasions.ts";
import { isReady } from "../lib/resource.ts";
import u from "../utilities.module.css";

/** Starts a group's Secret Santa for one of its occasions (/groups/:groupId/occasions/:occasionId/secret-santa). */
export default function SecretSantaStart() {
  const params = useParams<{ groupId: GroupId; occasionId: OccasionId }>();
  const me = useMe();
  const [group] = createCachedResource(() => params.groupId, loadGroup);
  const [occasions] = createCachedResource(() => params.groupId, loadGroupOccasions);
  const [draws] = createCachedResource(() => params.groupId, loadSecretSantas);

  const occasion = () => occasions()?.find((o) => o.id === params.occasionId);
  const isManager = () =>
    group()?.group_members.some((m) => m.profile_id === me().profile.id && m.role === "manager") ??
    false;
  const ready = () => isReady(group) && isReady(occasions) && isReady(draws);
  const hasDraw = () => draws()?.some((d) => d.occasion_id === params.occasionId) ?? false;
  const passed = () => (occasion()?.date ?? "") < today();
  // Only offered to a manager for an upcoming occasion without a draw.
  const canStart = () => isManager() && !!occasion() && !passed() && !hasDraw();

  const start = createSecretSantaStart(
    () => params.groupId,
    () => occasion()?.name ?? "",
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
      <Show when={group.error || occasions.error || draws.error}>
        <p class={u.error} role="alert">
          {t("group.unavailable")}
        </p>
      </Show>
      <Show when={!ready() && !group.error && !occasions.error && !draws.error}>
        <p class={u.muted}>{t("common.loading")}</p>
      </Show>
      {/* Always there, so screen readers notice when the draw has been made. */}
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
      </div>
      <Show when={ready() && !start.started()}>
        <Show
          when={canStart()}
          fallback={
            <p class={u.muted}>
              {!isManager()
                ? t("secretSanta.managersOnly")
                : !occasion() || passed()
                  ? t("secretSanta.occasionGone")
                  : t("secretSanta.alreadyStarted")}
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
      </Show>
    </>
  );
}
