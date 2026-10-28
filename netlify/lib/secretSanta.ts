// The Secret Santa draw (#102): who buys for whom.
//
// Everyone gives to exactly one person and receives from exactly one person, which
// splits into closed loops of givers → recipients. The rules:
//
// 1. Nobody draws themselves.
// 2. A giver doesn't draw anyone the manager excluded for them.
// 3. A giver doesn't draw anyone they drew in the group's previous 2 draws.
// 4. The manager picks a minimum loop size: "all" makes one loop through everyone, a number
//    (from 2 up to half the participants) allows several loops of at least that many
//    people each. A bigger minimum makes the result harder to guess.
//
// When no draw is possible, the oldest of the 2 previous draws is dropped from the
// history and the draw is tried again. If that fails as well, the result names the
// participant with the fewest options, so the manager can change the exclusions.
//
// A random backtracking search, which is instant for a few dozen people. Each search
// has a step limit, so a draw that is impossible in a hard way ends up as "not
// possible" instead of hanging.
//
// See supabase/migrations/20261027140000_secret_santa.sql for where the result goes.

/** `giver` buys for `recipient`. Both are profile ids. */
export type Pair = { giver: string; recipient: string };

/** `profile` must not draw `excluded`. One way: for a couple, give both directions. */
export type Exclusion = { profile: string; excluded: string };

export type DrawInput = {
  participants: string[];
  exclusions: Exclusion[];
  /** The group's previous draws, the latest first. Only the first 2 count. */
  history?: Pair[][];
  /** Defaults to "all": one loop through everyone. */
  minLoopSize?: MinLoopSize;
  /** For tests. Gives a number from 0 up to 1, like Math.random. */
  random?: () => number;
};

export type DrawResult =
  | { ok: true; pairs: Pair[] }
  | { ok: false; reason: { kind: "too_few_participants" } }
  | { ok: false; reason: { kind: "too_many_exclusions"; profile: string } };

/**
 * How small a loop may be: "all" is one loop through everyone, a number is the fewest people
 * in any loop.
 */
export type MinLoopSize = number | "all";

/** The biggest number offered as a minimum loop size: half the participants, rounded down. */
export const maxMinLoopSize = (participants: number) => Math.floor(participants / 2);

const STEP_LIMIT = 100_000;

type Allowed = Map<string, string[]>;

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** For every participant, who they may draw with these pairs of people ruled out. */
function allowedRecipients(
  participants: string[],
  exclusions: Exclusion[],
  history: Pair[][],
): Allowed {
  const forbidden = new Set<string>();
  const key = (giver: string, recipient: string) => `${giver}\n${recipient}`;
  for (const { profile, excluded } of exclusions) forbidden.add(key(profile, excluded));
  for (const draw of history) {
    for (const { giver, recipient } of draw) forbidden.add(key(giver, recipient));
  }
  return new Map(
    participants.map((giver) => [
      giver,
      participants.filter((other) => other !== giver && !forbidden.has(key(giver, other))),
    ]),
  );
}

/** One loop through everyone, as the people in the order they give to each other. */
function findSingleLoop(participants: string[], allowed: Allowed, random: () => number) {
  const start = participants[0];
  const path = [start];
  const visited = new Set(path);
  let steps = 0;

  const options = (from: string) => allowed.get(from)!.filter((next) => !visited.has(next));

  function extend(): boolean {
    const current = path[path.length - 1];
    if (path.length === participants.length) return allowed.get(current)!.includes(start);
    if (++steps > STEP_LIMIT) return false;

    // Hardest people first, so dead ends show up early.
    const candidates = shuffle(options(current), random).map((next) => {
      visited.add(next);
      const onward = options(next).length + (allowed.get(next)!.includes(start) ? 1 : 0);
      visited.delete(next);
      return { next, onward };
    });
    candidates.sort((a, b) => a.onward - b.onward);

    for (const { next } of candidates) {
      path.push(next);
      visited.add(next);
      if (extend()) return true;
      visited.delete(next);
      path.pop();
      if (steps > STEP_LIMIT) return false;
    }
    return false;
  }

  return extend() ? path : null;
}

/** Any draw where every loop has at least `minLoop` people. */
function findLoops(
  participants: string[],
  allowed: Allowed,
  minLoop: number,
  random: () => number,
): Pair[] | null {
  // The most constrained givers first.
  const givers = shuffle(participants, random).sort(
    (a, b) => allowed.get(a)!.length - allowed.get(b)!.length,
  );
  const next = new Map<string, string>();
  const taken = new Set<string>();
  let steps = 0;

  /** How many people the loop has that `giver` → `recipient` would close, if any. */
  function closedLoopSize(giver: string, recipient: string) {
    let size = 1;
    let current = recipient;
    while (next.has(current)) {
      current = next.get(current)!;
      size++;
    }
    return current === giver ? size : null;
  }

  function assign(index: number): boolean {
    if (index === givers.length) return true;
    if (++steps > STEP_LIMIT) return false;
    const giver = givers[index];
    for (const recipient of shuffle(allowed.get(giver)!, random)) {
      if (taken.has(recipient)) continue;
      const size = closedLoopSize(giver, recipient);
      if (size !== null && size < minLoop) continue;
      next.set(giver, recipient);
      taken.add(recipient);
      if (assign(index + 1)) return true;
      next.delete(giver);
      taken.delete(recipient);
      if (steps > STEP_LIMIT) return false;
    }
    return false;
  }

  if (!assign(0)) return null;
  return participants.map((giver) => ({ giver, recipient: next.get(giver)! }));
}

function solve(
  participants: string[],
  allowed: Allowed,
  minLoopSize: MinLoopSize,
  random: () => number,
): Pair[] | null {
  if (minLoopSize === "all" || minLoopSize * 2 > participants.length) {
    const loop = findSingleLoop(participants, allowed, random);
    return (
      loop?.map((giver, index) => ({ giver, recipient: loop[(index + 1) % loop.length] })) ?? null
    );
  }
  return findLoops(participants, allowed, minLoopSize, random);
}

/** The participant with the fewest people to draw or to be drawn by. */
function mostConstrained(participants: string[], allowed: Allowed) {
  const receivers = new Map(participants.map((id) => [id, 0]));
  for (const options of allowed.values()) {
    for (const id of options) receivers.set(id, receivers.get(id)! + 1);
  }
  let worst = participants[0];
  let fewest = Infinity;
  for (const id of participants) {
    const options = Math.min(allowed.get(id)!.length, receivers.get(id)!);
    if (options < fewest) {
      fewest = options;
      worst = id;
    }
  }
  return worst;
}

/** Draws who buys for whom, or says who has too many exclusions. */
export function draw({
  participants,
  exclusions,
  history = [],
  minLoopSize = "all",
  random = Math.random,
}: DrawInput): DrawResult {
  const people = [...new Set(participants)];
  if (people.length < 2) return { ok: false, reason: { kind: "too_few_participants" } };

  const recent = history.slice(0, 2);
  // First with the last 2 draws as history, then with only the latest.
  const attempts = recent.length === 2 ? [recent, recent.slice(0, 1)] : [recent];
  for (const attempt of attempts) {
    const pairs = solve(
      people,
      allowedRecipients(people, exclusions, attempt),
      minLoopSize,
      random,
    );
    if (pairs) return { ok: true, pairs };
  }

  const last = attempts[attempts.length - 1];
  const allowed = allowedRecipients(people, exclusions, last);
  return {
    ok: false,
    reason: { kind: "too_many_exclusions", profile: mostConstrained(people, allowed) },
  };
}
