import { describe, expect, it } from "vitest";

import type { DebtEntry, GroupDebtSummary } from "./types";
import {
  applySettlement,
  calculateDebts,
  debtsBetweenOthers,
  debtsFor,
  pairDebt,
} from "./debt";
import { debtHero, personLookup } from "./formatting";

type Expense = Parameters<typeof calculateDebts>[0][number];

const YOU = 1;
const LENA = 2;
const MAX = 3;
const SOPHIE = 4;

function owes(
  debtor: number,
  creditor: number,
  amountInCents: number,
  currency = "EUR",
): Expense {
  return {
    paidByGroupMemberId: creditor,
    amountInCents,
    currency,
    expenseSplits: [{ groupMemberId: debtor, amountInCents }],
  };
}

function shared(
  payer: number,
  shares: Record<number, number>,
  currency = "EUR",
): Expense {
  const expenseSplits = Object.entries(shares).map(([id, amountInCents]) => ({
    groupMemberId: Number(id),
    amountInCents,
  }));
  return {
    paidByGroupMemberId: payer,
    amountInCents: expenseSplits.reduce((sum, s) => sum + s.amountInCents, 0),
    currency,
    expenseSplits,
  };
}

function debt(
  from: number,
  to: number,
  amountInCents: number,
  currency = "EUR",
): DebtEntry {
  return {
    fromGroupMemberId: from,
    toGroupMemberId: to,
    amountInCents,
    currency,
  };
}

const settlementOf = (d: DebtEntry) =>
  owes(d.toGroupMemberId, d.fromGroupMemberId, d.amountInCents, d.currency);

function eur(summary: GroupDebtSummary) {
  const currency = summary.currencies.EUR;
  if (!currency) throw new Error("no EUR summary");
  return currency;
}

// Brute-force reference: sum every split between payer and splitter, per pair
function referenceDirect(expenses: Expense[]) {
  const nets = new Map<string, number>();
  for (const {
    paidByGroupMemberId: payer,
    currency,
    expenseSplits,
  } of expenses) {
    for (const { groupMemberId: member, amountInCents } of expenseSplits) {
      if (member === payer) continue;
      const [low, high] = member < payer ? [member, payer] : [payer, member];
      const key = `${currency}|${low}|${high}`;
      const signed = member === low ? amountInCents : -amountInCents;
      nets.set(key, (nets.get(key) ?? 0) + signed);
    }
  }
  const byCurrency: Record<string, DebtEntry[]> = {};
  for (const [key, net] of nets) {
    if (net === 0) continue;
    const [currency = "", low, high] = key.split("|");
    const [from, to] = net > 0 ? [low, high] : [high, low];
    (byCurrency[currency] ??= []).push(
      debt(Number(from), Number(to), Math.abs(net), currency),
    );
  }
  for (const debts of Object.values(byCurrency)) {
    debts.sort(
      (a, b) =>
        a.fromGroupMemberId - b.fromGroupMemberId ||
        a.toGroupMemberId - b.toGroupMemberId,
    );
  }
  return byCurrency;
}

function referenceBalances(expenses: Expense[]) {
  const balances: Record<string, number> = {};
  const add = (member: number, currency: string, delta: number) => {
    const key = `${member}|${currency}`;
    balances[key] = (balances[key] ?? 0) + delta;
  };
  for (const e of expenses) {
    add(e.paidByGroupMemberId, e.currency, e.amountInCents);
    for (const s of e.expenseSplits) {
      add(s.groupMemberId, e.currency, -s.amountInCents);
    }
  }
  return nonZero(balances);
}

function nonZero(balances: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(balances).filter(([, cents]) => cents !== 0),
  );
}

function flatBalances(summary: GroupDebtSummary) {
  const flat: Record<string, number> = {};
  for (const [member, byCurrency] of Object.entries(summary.memberBalances)) {
    for (const [currency, cents] of Object.entries(byCurrency)) {
      flat[`${member}|${currency}`] = cents;
    }
  }
  return nonZero(flat);
}

function balancesImpliedBy(debts: DebtEntry[]) {
  const flat: Record<string, number> = {};
  for (const d of debts) {
    const from = `${d.fromGroupMemberId}|${d.currency}`;
    const to = `${d.toGroupMemberId}|${d.currency}`;
    flat[from] = (flat[from] ?? 0) - d.amountInCents;
    flat[to] = (flat[to] ?? 0) + d.amountInCents;
  }
  return nonZero(flat);
}

const allOf = (summary: GroupDebtSummary, kind: "direct" | "simplified") =>
  Object.values(summary.currencies).flatMap((entry) => entry[kind]);

function randomGroup(seed: number) {
  let state = seed;
  const random = (n: number) => {
    state = (state * 16807) % 2147483647;
    return state % n;
  };
  const members = Array.from({ length: 2 + random(6) }, (_, i) => i + 1);
  const pick = () => members[random(members.length)] ?? 1;
  const expenses = Array.from({ length: 1 + random(40) }, (): Expense => {
    const currency = random(4) === 0 ? "USD" : "EUR";
    const payer = pick();
    if (random(5) === 0) {
      const receiver = members.find((m) => m !== payer) ?? payer;
      return owes(receiver, payer, 1 + random(9000), currency);
    }
    const splitters = members.filter(() => random(3) !== 0);
    const people = splitters.length > 0 ? splitters : [payer];
    const total = 1 + random(20000);
    const base = Math.floor(total / people.length);
    const shares: Record<number, number> = {};
    people.forEach((member, i) => {
      shares[member] = base + (i < total - base * people.length ? 1 : 0);
    });
    return shared(payer, shares, currency);
  });
  return { members, expenses, random };
}

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);

const scenario = [
  owes(MAX, YOU, 4250),
  owes(SOPHIE, YOU, 1800),
  owes(YOU, LENA, 3000),
  owes(MAX, LENA, 2500),
  owes(SOPHIE, MAX, 1200),
  owes(SOPHIE, LENA, 800),
];

describe("balances", () => {
  it("credits the payer the full amount and debits every share, the payer's own included", () => {
    const summary = calculateDebts([
      shared(YOU, { [YOU]: 334, [LENA]: 333, [MAX]: 333 }),
    ]);

    expect(summary.memberBalances).toEqual({
      [YOU]: { EUR: 666 },
      [LENA]: { EUR: -333 },
      [MAX]: { EUR: -333 },
    });
  });

  it("handles a payer who isn't part of the split", () => {
    const summary = calculateDebts([shared(YOU, { [LENA]: 500, [MAX]: 500 })]);

    expect(summary.memberBalances).toEqual({
      [YOU]: { EUR: 1000 },
      [LENA]: { EUR: -500 },
      [MAX]: { EUR: -500 },
    });
  });

  it("moves balances for a settlement like for any expense", () => {
    const summary = calculateDebts([
      owes(MAX, YOU, 1000),
      settlementOf(debt(MAX, YOU, 400)),
    ]);

    expect(summary.memberBalances).toEqual({
      [YOU]: { EUR: 600 },
      [MAX]: { EUR: -600 },
    });
  });

  it("keeps currencies apart", () => {
    const summary = calculateDebts([
      owes(MAX, YOU, 1000, "EUR"),
      owes(YOU, MAX, 1500, "USD"),
    ]);

    expect(summary.memberBalances[YOU]).toEqual({ EUR: 1000, USD: -1500 });
    expect(summary.memberBalances[MAX]).toEqual({ EUR: -1000, USD: 1500 });
  });

  it.each(SEEDS)(
    "match the reference and sum to zero per currency (seed %i)",
    (seed) => {
      const { expenses } = randomGroup(seed);
      const summary = calculateDebts(expenses);

      expect(flatBalances(summary)).toEqual(referenceBalances(expenses));
      for (const currency of Object.keys(summary.currencies)) {
        const total = Object.values(summary.memberBalances).reduce(
          (sum, byCurrency) => sum + (byCurrency[currency] ?? 0),
          0,
        );
        expect(total).toBe(0);
      }
    },
  );
});

describe("direct debts (Actual)", () => {
  it("is each splitter's share owed to the payer", () => {
    const summary = calculateDebts([
      shared(YOU, { [YOU]: 334, [LENA]: 333, [MAX]: 333 }),
    ]);

    expect(eur(summary).direct).toEqual([
      debt(LENA, YOU, 333),
      debt(MAX, YOU, 333),
    ]);
  });

  it("nets both directions of a pair into one debt", () => {
    const summary = calculateDebts([owes(YOU, MAX, 1000), owes(MAX, YOU, 300)]);

    expect(eur(summary).direct).toEqual([debt(YOU, MAX, 700)]);
  });

  it("drops a pair that nets to exactly zero", () => {
    const summary = calculateDebts([
      owes(YOU, MAX, 1000),
      owes(MAX, YOU, 1000),
    ]);

    expect(eur(summary).direct).toEqual([]);
  });

  it("keeps circular debts as they are", () => {
    const summary = calculateDebts([
      owes(YOU, LENA, 1000),
      owes(LENA, MAX, 400),
      owes(MAX, YOU, 700),
    ]);

    expect(eur(summary).direct).toEqual([
      debt(YOU, LENA, 1000),
      debt(LENA, MAX, 400),
      debt(MAX, YOU, 700),
    ]);
  });

  it("keeps a debt that sits on a loop (regression: a flatmate you owe vanished)", () => {
    // Pair nets from a real 4-person flat; you owe Jo, Jo owes Sam, Sam owes you
    const JO = 7;
    const SAM = 8;
    const KIM = 6;
    const summary = calculateDebts([
      owes(YOU, JO, 1270),
      owes(JO, SAM, 6300),
      owes(KIM, JO, 4245),
      owes(SAM, YOU, 2674),
      owes(SAM, KIM, 3491),
      owes(KIM, YOU, 6960),
      owes(YOU, KIM, 125, "USD"),
      owes(JO, KIM, 125, "USD"),
      owes(SAM, KIM, 125, "USD"),
    ]);

    expect(eur(summary).direct).toEqual([
      debt(YOU, JO, 1270),
      debt(KIM, YOU, 6960),
      debt(KIM, JO, 4245),
      debt(JO, SAM, 6300),
      debt(SAM, YOU, 2674),
      debt(SAM, KIM, 3491),
    ]);
    expect(summary.memberBalances).toEqual({
      [YOU]: { EUR: 8364, USD: -125 },
      [JO]: { EUR: -785, USD: -125 },
      [SAM]: { EUR: 135, USD: -125 },
      [KIM]: { EUR: -7714, USD: 375 },
    });
    expect(eur(summary).simplified).toEqual([
      debt(KIM, YOU, 7714),
      debt(JO, YOU, 650),
      debt(JO, SAM, 135),
    ]);
  });

  it("keeps the seeded e2e scenario's debts, balances and plan", () => {
    const summary = calculateDebts(scenario);

    expect(eur(summary).direct).toEqual([
      debt(YOU, LENA, 3000),
      debt(MAX, YOU, 4250),
      debt(MAX, LENA, 2500),
      debt(SOPHIE, YOU, 1800),
      debt(SOPHIE, LENA, 800),
      debt(SOPHIE, MAX, 1200),
    ]);
    expect(summary.memberBalances).toEqual({
      [YOU]: { EUR: 3050 },
      [LENA]: { EUR: 6300 },
      [MAX]: { EUR: -5550 },
      [SOPHIE]: { EUR: -3800 },
    });
    expect(eur(summary).simplified).toEqual([
      debt(MAX, LENA, 5550),
      debt(SOPHIE, LENA, 750),
      debt(SOPHIE, YOU, 3050),
    ]);
  });

  it.each(SEEDS)("equals the brute-force pair sums (seed %i)", (seed) => {
    const { expenses } = randomGroup(seed);
    const summary = calculateDebts(expenses);

    const actual = Object.fromEntries(
      Object.values(summary.currencies)
        .filter(({ direct }) => direct.length > 0)
        .map(({ currency, direct }) => [currency, direct]),
    );
    expect(actual).toEqual(referenceDirect(expenses));
  });

  it.each(SEEDS)("implies exactly the member balances (seed %i)", (seed) => {
    const { expenses } = randomGroup(seed);
    const summary = calculateDebts(expenses);

    expect(balancesImpliedBy(allOf(summary, "direct"))).toEqual(
      flatBalances(summary),
    );
  });

  it.each(SEEDS.slice(0, 40))(
    "doesn't depend on expense order (seed %i)",
    (seed) => {
      const { expenses } = randomGroup(seed);

      expect(calculateDebts([...expenses].reverse())).toEqual(
        calculateDebts(expenses),
      );
    },
  );
});

describe("simplified (the settle plan)", () => {
  it("is empty when everyone is even", () => {
    const summary = calculateDebts([
      owes(YOU, MAX, 1000),
      owes(MAX, YOU, 1000),
    ]);

    expect(eur(summary).simplified).toEqual([]);
  });

  it("collapses a chain into one payment", () => {
    const summary = calculateDebts([
      owes(YOU, LENA, 500),
      owes(LENA, MAX, 500),
    ]);

    expect(eur(summary).simplified).toEqual([debt(YOU, MAX, 500)]);
  });

  it("is the same list under the deprecated debts field", () => {
    const summary = calculateDebts(scenario);

    expect(eur(summary).debts).toEqual(eur(summary).simplified);
  });

  it.each(SEEDS)(
    "settles every balance in at most n-1 payments (seed %i)",
    (seed) => {
      const { expenses } = randomGroup(seed);
      const summary = calculateDebts(expenses);

      for (const { currency, simplified } of Object.values(
        summary.currencies,
      )) {
        const open = Object.values(summary.memberBalances).filter(
          (byCurrency) => (byCurrency[currency] ?? 0) !== 0,
        ).length;
        expect(simplified.length).toBeLessThanOrEqual(Math.max(open - 1, 0));
        for (const payment of simplified) {
          expect(payment.amountInCents).toBeGreaterThan(0);
          expect(
            summary.memberBalances[payment.fromGroupMemberId]?.[currency],
          ).toBeLessThan(0);
          expect(
            summary.memberBalances[payment.toGroupMemberId]?.[currency],
          ).toBeGreaterThan(0);
        }
      }
      expect(balancesImpliedBy(allOf(summary, "simplified"))).toEqual(
        flatBalances(summary),
      );

      const settled = calculateDebts([
        ...expenses,
        ...allOf(summary, "simplified").map(settlementOf),
      ]);
      expect(flatBalances(settled)).toEqual({});
      expect(allOf(settled, "simplified")).toEqual([]);
    },
  );
});

describe("applySettlement", () => {
  const summary = calculateDebts(scenario);

  it("clears a fully paid debt", () => {
    const next = applySettlement(summary, debt(MAX, YOU, 4250));

    expect(eur(next).direct).not.toContainEqual(
      expect.objectContaining({ fromGroupMemberId: MAX, toGroupMemberId: YOU }),
    );
    expect(next.memberBalances[MAX]?.EUR).toBe(-1300);
    expect(next.memberBalances[YOU]?.EUR).toBe(-1200);
  });

  it("reduces a partially paid debt", () => {
    const next = applySettlement(summary, debt(MAX, YOU, 1250));

    expect(eur(next).direct).toContainEqual(debt(MAX, YOU, 3000));
  });

  it("flips the remainder of an overpayment", () => {
    const next = applySettlement(summary, debt(SOPHIE, MAX, 2000));

    expect(eur(next).direct).toContainEqual(debt(MAX, SOPHIE, 800));
  });

  it("creates a receiver-owes-payer debt when the pair had none", () => {
    const next = applySettlement(
      calculateDebts([owes(MAX, YOU, 1000)]),
      debt(LENA, SOPHIE, 500),
    );

    expect(eur(next).direct).toEqual([
      debt(MAX, YOU, 1000),
      debt(SOPHIE, LENA, 500),
    ]);
  });

  it("starts a currency the group never used", () => {
    const next = applySettlement(summary, debt(YOU, MAX, 1500, "USD"));

    expect(next.currencies.USD?.direct).toEqual([debt(MAX, YOU, 1500, "USD")]);
    expect(next.currencies.EUR).toEqual(summary.currencies.EUR);
  });

  it("leaves the pair debts in place when the whole plan is paid, while every balance hits zero", () => {
    const next = eur(summary).simplified.reduce(applySettlement, summary);

    expect(flatBalances(next)).toEqual({});
    expect(eur(next).simplified).toEqual([]);
    expect(eur(next).direct).toEqual(
      eur(
        calculateDebts([
          ...scenario,
          ...eur(summary).simplified.map(settlementOf),
        ]),
      ).direct,
    );
  });

  it("leaves the input summary untouched", () => {
    const before = structuredClone(summary);
    applySettlement(summary, debt(MAX, YOU, 4250));

    expect(summary).toEqual(before);
  });

  it.each(SEEDS)(
    "gives exactly what the server computes after the settlement (seed %i)",
    (seed) => {
      const { expenses, members, random } = randomGroup(seed);
      const from = members[random(members.length)] ?? 1;
      const to = members.find((m) => m !== from) ?? from;
      const settlement = debt(
        from,
        to,
        1 + random(5000),
        random(3) === 0 ? "USD" : "EUR",
      );

      const optimistic = applySettlement(calculateDebts(expenses), settlement);
      const server = calculateDebts([...expenses, settlementOf(settlement)]);

      expect(optimistic.currencies).toEqual(server.currencies);
      expect(flatBalances(optimistic)).toEqual(flatBalances(server));
    },
  );
});

describe("debtsFor", () => {
  const summary = calculateDebts([...scenario, owes(YOU, MAX, 1500, "USD")]);

  it("groups a member's debts by person across currencies, largest first", () => {
    expect(debtsFor(summary, YOU, "direct")).toEqual([
      {
        groupMemberId: MAX,
        amounts: [
          { amountInCents: 4250, debt: debt(MAX, YOU, 4250) },
          { amountInCents: -1500, debt: debt(YOU, MAX, 1500, "USD") },
        ],
        direction: "owes you · you owe",
      },
      {
        groupMemberId: LENA,
        amounts: [{ amountInCents: -3000, debt: debt(YOU, LENA, 3000) }],
        direction: "you owe",
      },
      {
        groupMemberId: SOPHIE,
        amounts: [{ amountInCents: 1800, debt: debt(SOPHIE, YOU, 1800) }],
        direction: "owes you",
      },
    ]);
  });

  it("reads the simplified plan as payments", () => {
    expect(debtsFor(summary, YOU, "simplified")).toEqual([
      {
        groupMemberId: SOPHIE,
        amounts: [{ amountInCents: 3050, debt: debt(SOPHIE, YOU, 3050) }],
        direction: "pays you",
      },
      {
        groupMemberId: MAX,
        amounts: [{ amountInCents: -1500, debt: debt(YOU, MAX, 1500, "USD") }],
        direction: "you pay",
      },
    ]);
  });

  it.each(SEEDS.slice(0, 50))(
    "together with debtsBetweenOthers covers every debt exactly once (seed %i)",
    (seed) => {
      const { expenses, members } = randomGroup(seed);
      const group = calculateDebts(expenses);
      const me = members[0] ?? 1;

      for (const kind of ["direct", "simplified"] as const) {
        const mine = debtsFor(group, me, kind).flatMap(({ amounts }) =>
          amounts.map(({ debt: entry }) => entry),
        );
        const others = debtsBetweenOthers(group, me, kind);
        const key = (d: DebtEntry) =>
          `${d.currency}|${d.fromGroupMemberId}|${d.toGroupMemberId}|${d.amountInCents}`;
        expect([...mine, ...others].map(key).sort()).toEqual(
          allOf(group, kind).map(key).sort(),
        );
      }
    },
  );
});

describe("debtsBetweenOthers", () => {
  it("leaves out the member's own debts, largest first", () => {
    const summary = calculateDebts([...scenario, owes(YOU, MAX, 1500, "USD")]);

    expect(debtsBetweenOthers(summary, YOU, "direct")).toEqual([
      debt(MAX, LENA, 2500),
      debt(SOPHIE, MAX, 1200),
      debt(SOPHIE, LENA, 800),
    ]);
    expect(debtsBetweenOthers(summary, YOU, "simplified")).toEqual([
      debt(MAX, LENA, 5550),
      debt(SOPHIE, LENA, 750),
    ]);
  });
});

describe("pairDebt", () => {
  it("prefers the payer's own debt to the receiver", () => {
    const summary = calculateDebts([
      owes(MAX, YOU, 1000, "EUR"),
      owes(YOU, MAX, 1500, "USD"),
    ]);

    expect(pairDebt(summary, YOU, MAX)).toEqual(debt(YOU, MAX, 1500, "USD"));
    expect(pairDebt(summary, MAX, YOU)).toEqual(debt(MAX, YOU, 1000));
    expect(pairDebt(summary, YOU, MAX, "EUR")).toEqual(debt(MAX, YOU, 1000));
  });
});

describe("debtHero", () => {
  const person = personLookup(
    [
      { id: YOU, user: { name: "Ruffy" } },
      { id: LENA, user: { name: "Lena" } },
      { id: MAX, user: { name: "Max" } },
      { id: SOPHIE, user: { name: "Sophie" } },
    ],
    YOU,
  );
  const hero = (expenses: Expense[]) => {
    const summary = calculateDebts(expenses);
    return debtHero(summary, YOU, debtsFor(summary, YOU, "direct"), person);
  };

  it("says you are owed when every currency is in your favour", () => {
    expect(hero([owes(MAX, YOU, 3050)])).toEqual({
      label: "Overall you are owed",
      amounts: [{ currency: "EUR", cents: 3050, text: "€30.50" }],
      meta: "Max owes you",
    });
  });

  it("says you owe when every currency is against you", () => {
    expect(hero([owes(YOU, LENA, 1200), owes(YOU, MAX, 800)])).toEqual({
      label: "Overall you owe",
      amounts: [{ currency: "EUR", cents: -2000, text: "€20.00" }],
      meta: "You owe Lena and Max",
    });
  });

  it("signs each line when currencies point different ways", () => {
    expect(hero([owes(MAX, YOU, 3050), owes(YOU, MAX, 1500, "USD")])).toEqual({
      label: "Overall",
      amounts: [
        { currency: "EUR", cents: 3050, text: "+€30.50" },
        { currency: "USD", cents: -1500, text: "-$15.00" },
      ],
      meta: "Max owes you, you owe Max",
    });
  });

  it("names everyone you owe, even when your total is positive", () => {
    expect(
      hero([
        owes(SOPHIE, YOU, 6960),
        owes(MAX, YOU, 2674),
        owes(YOU, LENA, 1270),
      ]),
    ).toMatchObject({
      label: "Overall you are owed",
      amounts: [{ currency: "EUR", cents: 8364, text: "€83.64" }],
      meta: "Sophie and Max owe you, you owe Lena",
    });
  });

  it("shows a zero line when you're even", () => {
    expect(hero([owes(MAX, LENA, 500)])).toEqual({
      label: "Overall",
      amounts: [{ currency: "EUR", cents: 0, text: "€0.00" }],
      meta: "You don't owe anyone and nobody owes you",
    });
  });
});
