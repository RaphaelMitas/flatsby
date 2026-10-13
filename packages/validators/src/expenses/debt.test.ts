import { describe, expect, it } from "vitest";

import type { DebtEntry, GroupDebtSummary } from "./types";
import { applySettlement, calculateDebts } from "./debt";

const YOU = 1;
const LENA = 2;
const MAX = 3;
const SOPHIE = 4;

/** One expense where `creditor` paid and only `debtor` owes it */
function owes(
  debtor: number,
  creditor: number,
  amountInCents: number,
  currency = "EUR",
) {
  return {
    paidByGroupMemberId: creditor,
    amountInCents,
    currency,
    expenseSplits: [{ groupMemberId: debtor, amountInCents }],
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

function eur(summary: GroupDebtSummary) {
  const currency = summary.currencies.EUR;
  if (!currency) throw new Error("no EUR summary");
  return currency;
}

function balancesOf(debts: DebtEntry[]) {
  const balances = new Map<number, number>();
  for (const d of debts) {
    balances.set(
      d.fromGroupMemberId,
      (balances.get(d.fromGroupMemberId) ?? 0) - d.amountInCents,
    );
    balances.set(
      d.toGroupMemberId,
      (balances.get(d.toGroupMemberId) ?? 0) + d.amountInCents,
    );
  }
  return balances;
}

const pairKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

const scenario = [
  owes(MAX, YOU, 4250),
  owes(SOPHIE, YOU, 1800),
  owes(YOU, LENA, 3000),
  owes(MAX, LENA, 2500),
  owes(SOPHIE, MAX, 1200),
  owes(SOPHIE, LENA, 800),
];

describe("calculateDebts", () => {
  it("keeps the seeded scenario's direct debts, balances and plan", () => {
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

  it("nets both directions of a pair into one debt", () => {
    const summary = calculateDebts([owes(YOU, MAX, 1000), owes(MAX, YOU, 300)]);

    expect(eur(summary).direct).toEqual([debt(YOU, MAX, 700)]);
  });

  it("cancels a cycle of three completely", () => {
    const summary = calculateDebts([
      owes(YOU, LENA, 1000),
      owes(LENA, MAX, 1000),
      owes(MAX, YOU, 1000),
    ]);

    expect(eur(summary).direct).toEqual([]);
  });

  it("cancels only the cycle's smallest edge from an uneven cycle", () => {
    const summary = calculateDebts([
      owes(YOU, LENA, 1000),
      owes(LENA, MAX, 400),
      owes(MAX, YOU, 700),
    ]);

    expect(eur(summary).direct).toEqual([
      debt(YOU, LENA, 600),
      debt(MAX, YOU, 300),
    ]);
  });

  it("shows nothing for a group that settled along the simplified plan", () => {
    const expenses = [
      owes(YOU, LENA, 3000),
      owes(LENA, MAX, 2000),
      owes(MAX, SOPHIE, 2500),
      owes(SOPHIE, YOU, 1000),
    ];
    const plan = eur(calculateDebts(expenses)).simplified;
    expect(plan.length).toBeGreaterThan(0);

    const settlements = plan.map((d) =>
      owes(d.toGroupMemberId, d.fromGroupMemberId, d.amountInCents),
    );
    const summary = calculateDebts([...expenses, ...settlements]);

    expect(Object.values(summary.memberBalances)).toEqual(
      Object.values(summary.memberBalances).map(() => ({ EUR: 0 })),
    );
    expect(eur(summary).direct).toEqual([]);
    expect(eur(summary).simplified).toEqual([]);
  });

  it("only shrinks pair debts and preserves balances on a tangled group", () => {
    let seed = 42;
    const random = (n: number) => {
      seed = (seed * 16807) % 2147483647;
      return seed % n;
    };
    const members = [YOU, LENA, MAX, SOPHIE, 5, 6];
    const expenses = Array.from({ length: 60 }, () => {
      const debtor = members[random(6)] ?? YOU;
      const creditors = members.filter((m) => m !== debtor);
      return owes(debtor, creditors[random(5)] ?? LENA, 100 + random(5000));
    });

    // positive: the lower member id owes the higher one
    const netBefore = new Map<string, number>();
    for (const e of expenses) {
      const [split] = e.expenseSplits;
      if (!split) continue;
      const key = pairKey(split.groupMemberId, e.paidByGroupMemberId);
      const sign = split.groupMemberId < e.paidByGroupMemberId ? 1 : -1;
      netBefore.set(
        key,
        (netBefore.get(key) ?? 0) + sign * split.amountInCents,
      );
    }

    const summary = calculateDebts(expenses);
    const { direct } = eur(summary);

    for (const d of direct) {
      const net = netBefore.get(
        pairKey(d.fromGroupMemberId, d.toGroupMemberId),
      );
      const sign = d.fromGroupMemberId < d.toGroupMemberId ? 1 : -1;
      expect(d.amountInCents).toBeGreaterThan(0);
      expect(d.amountInCents).toBeLessThanOrEqual(sign * (net ?? 0));
    }

    const total = (amounts: number[]) =>
      amounts.reduce((sum, amount) => sum + Math.abs(amount), 0);
    expect(total(direct.map((d) => d.amountInCents))).toBeLessThan(
      total([...netBefore.values()]),
    );

    const fromDirect = balancesOf(direct);
    for (const [member, balances] of Object.entries(summary.memberBalances)) {
      expect(fromDirect.get(Number(member)) ?? 0).toBe(balances.EUR);
    }
    expect(calculateDebts([...expenses].reverse())).toEqual(summary);
  });

  it("keeps currencies separate", () => {
    const summary = calculateDebts([
      owes(MAX, YOU, 1000, "EUR"),
      owes(YOU, MAX, 1500, "USD"),
    ]);

    expect(summary.currencies.EUR?.direct).toEqual([debt(MAX, YOU, 1000)]);
    expect(summary.currencies.USD?.direct).toEqual([
      debt(YOU, MAX, 1500, "USD"),
    ]);
    expect(summary.memberBalances[YOU]).toEqual({ EUR: 1000, USD: -1500 });
  });
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
    expect(eur(next).simplified).toEqual(
      eur(calculateDebts([...scenario, owes(YOU, MAX, 4250)])).simplified,
    );
  });

  it("reduces a partially paid debt", () => {
    const next = applySettlement(summary, debt(MAX, YOU, 1250));

    expect(eur(next).direct).toContainEqual(debt(MAX, YOU, 3000));
  });

  it("flips the remainder of an overpayment", () => {
    const next = applySettlement(summary, debt(SOPHIE, MAX, 2000));

    expect(eur(next).direct).toContainEqual(debt(MAX, SOPHIE, 800));
    expect(eur(next).direct).not.toContainEqual(
      expect.objectContaining({
        fromGroupMemberId: SOPHIE,
        toGroupMemberId: MAX,
      }),
    );
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

  it("leaves the input summary untouched", () => {
    const before = structuredClone(summary);
    applySettlement(summary, debt(MAX, YOU, 4250));

    expect(summary).toEqual(before);
  });
});
