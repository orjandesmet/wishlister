import { describe, expect, it } from "vite-plus/test";
import { draw, maxMinLoopSize, type Exclusion, type Pair } from "./secretSanta.ts";

/** A small seeded random generator, so the tests repeat. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const people = (count: number) => Array.from({ length: count }, (_, i) => `p${i + 1}`);

function pairsOf(result: ReturnType<typeof draw>): Pair[] {
  if (!result.ok) throw new Error(`No draw: ${JSON.stringify(result.reason)}`);
  return result.pairs;
}

/** The sizes of the loops the pairs make. */
function loopSizes(pairs: Pair[]) {
  const next = new Map(pairs.map((p) => [p.giver, p.recipient]));
  const seen = new Set<string>();
  const sizes: number[] = [];
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    let size = 0;
    for (let current = start; !seen.has(current); current = next.get(current)!) {
      seen.add(current);
      size++;
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => a - b);
}

function expectEveryoneOnce(pairs: Pair[], participants: string[]) {
  expect(pairs.map((p) => p.giver).sort()).toEqual([...participants].sort());
  expect(pairs.map((p) => p.recipient).sort()).toEqual([...participants].sort());
}

const both = (a: string, b: string): Exclusion[] => [
  { profile: a, excluded: b },
  { profile: b, excluded: a },
];

describe("draw", () => {
  it("gives everyone exactly one person, and nobody themselves", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const participants = people(8);
      const pairs = pairsOf(draw({ participants, exclusions: [], random: seeded(seed) }));
      expectEveryoneOnce(pairs, participants);
      expect(pairs.every((p) => p.giver !== p.recipient)).toBe(true);
    }
  });

  it("needs at least 2 participants", () => {
    expect(draw({ participants: [], exclusions: [] })).toEqual({
      ok: false,
      reason: { kind: "too_few_participants" },
    });
    expect(draw({ participants: ["a"], exclusions: [] }).ok).toBe(false);
    expect(draw({ participants: ["a", "a"], exclusions: [] }).ok).toBe(false);
  });

  describe("small draws", () => {
    it("lets 2 people draw each other", () => {
      const pairs = pairsOf(draw({ participants: ["a", "b"], exclusions: [] }));
      expect(pairs).toHaveLength(2);
      expect(loopSizes(pairs)).toEqual([2]);
    });

    it("lets 3 people draw in a loop of 3", () => {
      const pairs = pairsOf(draw({ participants: people(3), exclusions: [] }));
      expectEveryoneOnce(pairs, people(3));
      expect(loopSizes(pairs)).toEqual([3]);
    });

    it("fails for 3 people when one of them excludes both others", () => {
      const result = draw({
        participants: ["a", "b", "c"],
        exclusions: [
          { profile: "a", excluded: "b" },
          { profile: "a", excluded: "c" },
        ],
      });
      expect(result).toEqual({ ok: false, reason: { kind: "too_many_exclusions", profile: "a" } });
    });
  });

  describe("loops", () => {
    const twoGroups = (size: number) => {
      const left = Array.from({ length: size }, (_, i) => `a${i + 1}`);
      const right = Array.from({ length: size }, (_, i) => `b${i + 1}`);
      // Nobody can draw from the other group, so each group makes loops of its own.
      const exclusions = left.flatMap((a) =>
        right.flatMap((b) => [
          { profile: a, excluded: b },
          { profile: b, excluded: a },
        ]),
      );
      return { left, right, participants: [...left, ...right], exclusions };
    };

    it("makes one loop through everyone by default", () => {
      for (let seed = 1; seed <= 25; seed++) {
        const pairs = pairsOf(
          draw({ participants: people(9), exclusions: [], random: seeded(seed) }),
        );
        expect(loopSizes(pairs)).toEqual([9]);
      }
    });

    it("makes one loop through everyone for 'all' too, and never several", () => {
      for (let seed = 1; seed <= 25; seed++) {
        const pairs = pairsOf(
          draw({
            participants: people(10),
            exclusions: [],
            minLoopSize: "all",
            random: seeded(seed),
          }),
        );
        expect(loopSizes(pairs)).toEqual([10]);
      }
    });

    it("fails for 'all' when one loop is impossible, instead of making several", () => {
      const { participants, exclusions } = twoGroups(4);
      const result = draw({ participants, exclusions, minLoopSize: "all" });
      expect(result.ok).toBe(false);
    });

    it("keeps every loop at the minimum size or bigger", () => {
      for (const minLoopSize of [2, 3, 4, 5]) {
        for (let seed = 1; seed <= 15; seed++) {
          const pairs = pairsOf(
            draw({
              participants: people(11),
              exclusions: [...both("p1", "p2"), ...both("p3", "p4"), ...both("p5", "p6")],
              minLoopSize,
              random: seeded(seed),
            }),
          );
          expect(Math.min(...loopSizes(pairs))).toBeGreaterThanOrEqual(minLoopSize);
        }
      }
    });

    it("makes several loops when the minimum allows it and one big loop is impossible", () => {
      const { left, participants, exclusions } = twoGroups(4);
      for (let seed = 1; seed <= 10; seed++) {
        const pairs = pairsOf(
          draw({ participants, exclusions, minLoopSize: 4, random: seeded(seed) }),
        );
        expect(loopSizes(pairs)).toEqual([4, 4]);
        for (const pair of pairs) {
          expect(left.includes(pair.giver)).toBe(left.includes(pair.recipient));
        }
      }
    });

    it("lets people draw each other in loops of 2 when the minimum is 2", () => {
      const seen = new Set<number>();
      for (let seed = 1; seed <= 60; seed++) {
        const pairs = pairsOf(
          draw({ participants: people(6), exclusions: [], minLoopSize: 2, random: seeded(seed) }),
        );
        for (const size of loopSizes(pairs)) seen.add(size);
      }
      expect(seen.has(2)).toBe(true);
    });

    it("fails when the minimum is bigger than the loops that are possible", () => {
      const { participants, exclusions } = twoGroups(3);
      expect(draw({ participants, exclusions, minLoopSize: 4 }).ok).toBe(false);
      // Loops of 3 are fine when 3 is the minimum.
      const pairs = pairsOf(draw({ participants, exclusions, minLoopSize: 3 }));
      expect(loopSizes(pairs)).toEqual([3, 3]);
    });

    it("treats a minimum above half the participants as one loop", () => {
      const pairs = pairsOf(draw({ participants: people(6), exclusions: [], minLoopSize: 5 }));
      expect(loopSizes(pairs)).toEqual([6]);
    });
  });

  describe("maxMinLoopSize", () => {
    it("is half the participants, rounded down", () => {
      expect([2, 3, 4, 5, 6, 9, 10].map(maxMinLoopSize)).toEqual([1, 1, 2, 2, 3, 4, 5]);
    });
  });

  describe("exclusions", () => {
    it("keeps people from drawing who was excluded for them", () => {
      for (let seed = 1; seed <= 25; seed++) {
        const pairs = pairsOf(
          draw({
            participants: people(6),
            exclusions: [
              { profile: "p1", excluded: "p2" },
              { profile: "p1", excluded: "p3" },
              { profile: "p4", excluded: "p5" },
            ],
            random: seeded(seed),
          }),
        );
        const recipientOf = new Map(pairs.map((p) => [p.giver, p.recipient]));
        expect(["p2", "p3"]).not.toContain(recipientOf.get("p1"));
        expect(recipientOf.get("p4")).not.toBe("p5");
      }
    });

    it("works one way: the other direction is still allowed", () => {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 60; seed++) {
        const pairs = pairsOf(
          draw({
            participants: people(5),
            exclusions: [{ profile: "p1", excluded: "p2" }],
            random: seeded(seed),
          }),
        );
        const recipientOf = new Map(pairs.map((p) => [p.giver, p.recipient]));
        expect(recipientOf.get("p1")).not.toBe("p2");
        seen.add(`${recipientOf.get("p2")}`);
      }
      expect(seen.has("p1")).toBe(true);
    });

    it("keeps a couple apart in both directions", () => {
      for (let seed = 1; seed <= 25; seed++) {
        const pairs = pairsOf(
          draw({ participants: people(6), exclusions: both("p1", "p2"), random: seeded(seed) }),
        );
        const recipientOf = new Map(pairs.map((p) => [p.giver, p.recipient]));
        expect(recipientOf.get("p1")).not.toBe("p2");
        expect(recipientOf.get("p2")).not.toBe("p1");
      }
    });

    it("ignores exclusions about people who don't take part", () => {
      const pairs = pairsOf(
        draw({
          participants: people(4),
          exclusions: [
            { profile: "ghost", excluded: "p1" },
            { profile: "p1", excluded: "ghost" },
          ],
        }),
      );
      expectEveryoneOnce(pairs, people(4));
    });

    it("names who has too many exclusions", () => {
      const participants = people(5);
      const result = draw({
        participants,
        exclusions: ["p1", "p2", "p3", "p4"].map((excluded) => ({ profile: "p5", excluded })),
      });
      expect(result).toEqual({ ok: false, reason: { kind: "too_many_exclusions", profile: "p5" } });
    });

    it("names who nobody can draw", () => {
      const result = draw({
        participants: people(5),
        exclusions: ["p1", "p2", "p3", "p4"].map((profile) => ({ profile, excluded: "p5" })),
      });
      expect(result).toEqual({ ok: false, reason: { kind: "too_many_exclusions", profile: "p5" } });
    });
  });

  describe("history", () => {
    const ring = (ids: string[], step: number): Pair[] =>
      ids.map((giver, i) => ({ giver, recipient: ids[(i + step) % ids.length] }));

    it("doesn't give anyone the same person as in the last 2 draws", () => {
      const participants = people(8);
      const latest = ring(participants, 1);
      const older = ring(participants, 3);
      for (let seed = 1; seed <= 25; seed++) {
        const pairs = pairsOf(
          draw({ participants, exclusions: [], history: [latest, older], random: seeded(seed) }),
        );
        const recipientOf = new Map(pairs.map((p) => [p.giver, p.recipient]));
        for (const past of [...latest, ...older]) {
          expect(recipientOf.get(past.giver)).not.toBe(past.recipient);
        }
      }
    });

    it("only looks at the last 2 draws", () => {
      const participants = people(4);
      // Each person can only draw one person (the two latest draws rule out the
      // other two), unless the third draw is wrongly counted too.
      const history = [ring(participants, 1), ring(participants, 2), ring(participants, 3)];
      const pairs = pairsOf(draw({ participants, exclusions: [], history }));
      expect(pairs.map((p) => p.recipient)).toEqual(
        pairs.map((p) => participants[(participants.indexOf(p.giver) + 3) % 4]),
      );
    });

    it("drops the oldest draw when no draw is possible otherwise", () => {
      const participants = people(5);
      const latest = ring(participants, 1);
      const older = ring(participants, 2);
      // p1 is left with p2 and p3, who are both in the history.
      const exclusions: Exclusion[] = [
        { profile: "p1", excluded: "p4" },
        { profile: "p1", excluded: "p5" },
      ];
      const pairs = pairsOf(draw({ participants, exclusions, history: [latest, older] }));
      const recipientOf = new Map(pairs.map((p) => [p.giver, p.recipient]));
      // The oldest draw (p1 → p3) is dropped, the latest (p1 → p2) still counts.
      expect(recipientOf.get("p1")).toBe("p3");
      for (const past of latest) expect(recipientOf.get(past.giver)).not.toBe(past.recipient);
    });

    it("tells the manager when even the latest draw alone makes it impossible", () => {
      const participants = people(4);
      const latest = ring(participants, 1);
      const result = draw({
        participants,
        exclusions: [
          { profile: "p1", excluded: "p3" },
          { profile: "p1", excluded: "p4" },
        ],
        history: [latest, ring(participants, 2)],
      });
      expect(result).toEqual({ ok: false, reason: { kind: "too_many_exclusions", profile: "p1" } });
    });

    it("ignores history about people who no longer take part", () => {
      const participants = people(4);
      const history = [[{ giver: "gone", recipient: "p1" }, ...ring(participants, 1)]];
      const pairs = pairsOf(draw({ participants, exclusions: [], history }));
      expectEveryoneOnce(pairs, participants);
    });

    it("uses a single past draw as it is", () => {
      const participants = people(5);
      const latest = ring(participants, 1);
      const pairs = pairsOf(draw({ participants, exclusions: [], history: [latest] }));
      const recipientOf = new Map(pairs.map((p) => [p.giver, p.recipient]));
      for (const past of latest) expect(recipientOf.get(past.giver)).not.toBe(past.recipient);
    });
  });

  describe("randomness and size", () => {
    it("draws differently with different random numbers", () => {
      const results = new Set(
        Array.from({ length: 20 }, (_, i) =>
          JSON.stringify(
            pairsOf(draw({ participants: people(8), exclusions: [], random: seeded(i) })),
          ),
        ),
      );
      expect(results.size).toBeGreaterThan(5);
    });

    it("draws the same with the same random numbers", () => {
      const run = () =>
        pairsOf(draw({ participants: people(8), exclusions: [], random: seeded(7) }));
      expect(run()).toEqual(run());
    });

    it("draws 40 people with exclusions and history quickly", () => {
      const participants = people(40);
      const exclusions = Array.from({ length: 20 }, (_, i) =>
        both(`p${2 * i + 1}`, `p${2 * i + 2}`),
      ).flat();
      const history = [
        participants.map((giver, i) => ({ giver, recipient: participants[(i + 1) % 40] })),
        participants.map((giver, i) => ({ giver, recipient: participants[(i + 7) % 40] })),
      ];
      const started = Date.now();
      const pairs = pairsOf(draw({ participants, exclusions, history, random: seeded(3) }));
      expect(Date.now() - started).toBeLessThan(1000);
      expectEveryoneOnce(pairs, participants);
      expect(loopSizes(pairs)).toEqual([40]);
    });

    it("gives up on a hard impossible draw instead of hanging", () => {
      // 12 people who can only draw within two groups of 6 that each need a loop
      // of 6, but p1 can't draw anyone but themselves: impossible, and not trivially.
      const participants = people(12);
      const exclusions = participants
        .filter((id) => id !== "p1")
        .map((excluded) => ({ profile: "p1", excluded }));
      const started = Date.now();
      const result = draw({ participants, exclusions });
      expect(Date.now() - started).toBeLessThan(2000);
      expect(result).toEqual({ ok: false, reason: { kind: "too_many_exclusions", profile: "p1" } });
    });
  });
});
