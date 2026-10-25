import { createSignal } from "solid-js";
import {
  cancelInvite,
  getJoinLink,
  inviteToGroup,
  resetJoinLink,
  sendAddedEmail,
  sendInviteEmail,
  type InviteResult,
} from "./api/groups.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import type { GroupData } from "./createGroupData.ts";
import { t } from "./i18n.ts";

/** Inviting people to a group: by email, or with a link to share. */
export function createGroupInvites(data: GroupData, runner: ActionRunner) {
  const { run, setNotice, setError } = runner;
  const [inviteEmail, setInviteEmail] = createSignal("");

  const refetch = () => Promise.all([data.refetchGroup(), data.refetchInvites()]);

  /** Emails a pending invite and shows them as a member, since that creates their account. */
  async function emailInvite(email: string) {
    try {
      await sendInviteEmail(data.groupId(), email);
      setNotice(t("group.inviteSent", { email }));
    } catch (e) {
      setError(t("group.inviteEmailFailed", { email, message: (e as Error).message }));
    } finally {
      await refetch();
    }
  }

  /** Lets someone who already had an account know they're in the group now. */
  async function emailAdded(email: string) {
    try {
      const sent = await sendAddedEmail(data.groupId(), email);
      setNotice(t(sent === "sent" ? "group.addedEmailed" : "group.added", { email }));
    } catch (e) {
      setError(t("group.addedEmailFailed", { email, message: (e as Error).message }));
    }
  }

  const onInvite = (event: SubmitEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await inviteToGroup(data.groupId(), inviteEmail());
      const email = inviteEmail().trim();
      setInviteEmail("");
      if (result === "invited") {
        // No account yet: email them. The invite is saved either way, so if the
        // email fails they still join on first sign-in and can be emailed again.
        await emailInvite(email);
        return;
      }
      if (result === "added") {
        // They're in the group already; the email only tells them so.
        await emailAdded(email);
        await refetch();
        return;
      }
      const notices: Record<Exclude<InviteResult, "invited" | "added">, string> = {
        already_invited: t("group.alreadyInvited", { email }),
        already_member: t("group.alreadyMember", { email }),
      };
      setNotice(notices[result]);
      await refetch();
    });
  };

  const onCancelInvite = (email: string) =>
    run(async () => {
      await cancelInvite(data.groupId(), email);
      await data.refetchInvites();
    });

  /** Hands the link to the phone's share sheet, or copies it where there is none. */
  async function shareLink(link: string) {
    const name = data.group()!.name;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("group.shareTitle", { group: name }), url: link });
      } catch (e) {
        // Closing the share sheet isn't an error.
        if ((e as Error).name !== "AbortError") throw e;
      }
    } else {
      await navigator.clipboard.writeText(link);
      setNotice(t("group.linkCopied"));
    }
  }

  const onShareLink = () => run(async () => shareLink(await getJoinLink(data.groupId())));

  const onResetLink = () =>
    run(async () => {
      if (!confirm(t("group.confirmNewLink"))) return;
      await resetJoinLink(data.groupId());
      setNotice(t("group.newLinkMade"));
    });

  return {
    inviteEmail,
    setInviteEmail,
    onInvite,
    onEmailInvite: (email: string) => run(() => emailInvite(email)),
    onCancelInvite,
    onShareLink,
    onResetLink,
  };
}
