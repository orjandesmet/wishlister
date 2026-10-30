import { supabase } from "../supabase.ts";
import type { GroupId, OccasionId, ProfileId, SecretSantaId } from "../ids.ts";
import { today, type IsoDate } from "../occasions.ts";
import { must } from "./must.ts";

/** A member who can take part in a draw. */
export type SecretSantaCandidate = { profile_id: ProfileId; display_name: string };

/**
 * A group's draw for one occasion, as you see it: whether you take part and who you
 * drew. Never anyone else's pair, not even as a manager.
 */
export type SecretSanta = {
  id: SecretSantaId;
  occasion_id: OccasionId;
  taking_part: boolean;
  recipient_profile_id: ProfileId | null;
  recipient_name: string | null;
};

/** The person you drew in a draw whose occasion hasn't passed. */
export type DrawnPerson = {
  recipient_profile_id: ProfileId;
  occasion_id: OccasionId;
  occasion_name: string;
  occasion_date: IsoDate;
};

/** `profile` must not draw `excluded`. One way only. */
export type SecretSantaExclusion = { profile: ProfileId; excluded: ProfileId };

/**
 * The fewest people in any loop of the draw (a loop is people who only give to each other):
 * "all" is one loop through everyone, a number goes from 2 up to half the participants.
 */
export type MinLoopSize = number | "all";

export type SecretSantaInput = {
  occasionId: OccasionId;
  participants: ProfileId[];
  exclusions: SecretSantaExclusion[];
  minLoopSize: MinLoopSize;
  /** Markdown, sent along with the first email everyone gets. */
  message?: string;
};

/**
 * "sent": everyone has their email. "not_set_up": the site can't send emails (yet).
 * "failed": sending failed; it's tried again later. The draw is made in all three.
 */
export type MailState = "sent" | "not_set_up" | "failed";

/** Managers only: the members who can take part (an account and their own list). */
export async function getSecretSantaCandidates(groupId: GroupId): Promise<SecretSantaCandidate[]> {
  return must(
    await supabase.rpc("secret_santa_candidates", { target_group: groupId }),
  ) as SecretSantaCandidate[];
}

/** A group's draws, one per occasion that has one. */
export async function getSecretSantas(groupId: GroupId): Promise<SecretSanta[]> {
  return must(await supabase.rpc("get_secret_santas", { target_group: groupId })) as SecretSanta[];
}

/**
 * The occasions, in your groups, that have a Secret Santa. Anyone in the group may read that
 * a draw exists, not who takes part.
 */
export async function getSecretSantaOccasionIds(): Promise<OccasionId[]> {
  const rows = must(await supabase.from("secret_santas").select("occasion_id")) as {
    occasion_id: OccasionId;
  }[];
  return rows.map((row) => row.occasion_id);
}

/** The people you drew, across your groups, from today on. For the ribbon on their lists. */
export async function getDrawnPeople(): Promise<DrawnPerson[]> {
  return must(
    await supabase.rpc("my_secret_santa_recipients", { from_date: today() }),
  ) as DrawnPerson[];
}

/**
 * For the Nudge button on the list of someone you drew (#138): when you last nudged them, and
 * how many items on their list you could buy. Null when you didn't draw them in a draw that's
 * still to come.
 */
export type NudgeState = {
  secret_santa_id: SecretSantaId;
  /** ISO timestamp, null when you never nudged them. */
  last_nudged_at: string | null;
  buyable_items: number;
};

/** A nudge is for lists with fewer items to buy than this. */
export const NUDGE_BELOW_ITEMS = 3;
/** Days between two nudges to the same person. */
export const NUDGE_EVERY_DAYS = 3;

export async function getNudgeState(profileId: ProfileId): Promise<NudgeState | null> {
  const rows = must(
    await supabase.rpc("my_secret_santa_nudge", { target_profile: profileId, from_date: today() }),
  ) as NudgeState[];
  return rows[0] ?? null;
}

/**
 * Emails the person you drew, without your name, to ask for some ideas on their list.
 * "not_set_up" when the site can't send emails (yet). Throws when it's too soon or their
 * list has enough ideas (the server checks both).
 */
export async function nudgeSecretSanta(profileId: ProfileId): Promise<"sent" | "not_set_up"> {
  const result = await callFunction(
    "nudge-secret-santa",
    "Couldn't send the nudge",
    { recipient: profileId },
    [503],
  );
  return result.status === 503 ? "not_set_up" : "sent";
}

/** Managers only: who takes part in a draw. Not who drew whom. */
export async function getSecretSantaParticipants(
  drawId: SecretSantaId,
): Promise<SecretSantaCandidate[]> {
  return must(
    await supabase.rpc("secret_santa_participants", { target_secret_santa: drawId }),
  ) as SecretSantaCandidate[];
}

/**
 * Calls a Netlify function as the signed-in user, and reads its `message` on a failure.
 * Statuses in `allowed` aren't failures: they come back in `status`.
 */
async function callFunction<T>(
  name: string,
  failure: string,
  body?: unknown,
  allowed: number[] = [],
): Promise<T & { status: number }> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/.netlify/functions/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await response.json().catch(() => null)) as ({ message?: string } & T) | null;
  if (!response.ok && !allowed.includes(response.status)) {
    throw new Error(json?.message ?? `${failure} (${response.status})`);
  }
  return { ...(json as T), status: response.status };
}

/**
 * Managers only. Draws who buys for whom and emails everyone who takes part. Throws with
 * a reason when no draw is possible ("too many exclusions for Sara").
 */
export async function startSecretSanta(input: SecretSantaInput): Promise<MailState> {
  const result = await callFunction<{ mail: MailState }>(
    "start-secret-santa",
    "Couldn't start the Secret Santa",
    input,
  );
  return result.mail;
}

/**
 * Managers only. Takes someone out of a draw: whoever drew them gets the person they
 * drew, and an email about it. "draw_deleted" when too few people were left for a draw.
 */
export async function removeFromSecretSanta(
  drawId: SecretSantaId,
  profileId: ProfileId,
): Promise<"removed" | "draw_deleted"> {
  const result = must(
    await supabase.rpc("remove_from_secret_santa", {
      target_secret_santa: drawId,
      target_profile: profileId,
    }),
  ) as "removed" | "draw_deleted";
  void notify();
  return result;
}

/**
 * Emails whoever got a new person. Not waited for: the evening digest run sends whatever
 * this missed.
 */
async function notify() {
  try {
    await callFunction("notify-secret-santa", "Couldn't send the emails");
  } catch {
    // Offline, or running without Netlify (vp dev): the digest catches up.
  }
}
