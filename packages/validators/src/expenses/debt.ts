import type { MessageKey, Translate } from "@flatsby/i18n/message-key";

import { msg } from "@flatsby/i18n/message-key";

import type { ConvertibleExpense } from "./conversion";
import type { DebtEntry, GroupDebtSummary, MemberBalances } from "./types";
import { inLedgerCurrency } from "./conversion";

/** debtor -> creditor -> cents, every amount positive */
type DebtGraph = Map<number, Map<number, number>>;

export function calculateDebts(
  expenses: (ConvertibleExpense & { paidByGroupMemberId: number })[],
): GroupDebtSummary {
  const memberBalances: MemberBalances = {};
  const graphs = new Map<string, DebtGraph>();

  for (const { paidByGroupMemberId: payer, ...stored } of expenses) {
    const expense = inLedgerCurrency(stored);
    const { currency } = expense;
    adjustBalance(memberBalances, payer, currency, expense.amountInCents);

    let graph = graphs.get(currency);
    if (!graph) {
      graph = new Map();
      graphs.set(currency, graph);
    }
    for (const split of expense.expenseSplits) {
      adjustBalance(
        memberBalances,
        split.groupMemberId,
        currency,
        -split.amountInCents,
      );
      if (split.groupMemberId !== payer) {
        addDebt(graph, split.groupMemberId, payer, split.amountInCents);
      }
    }
  }

  const currencies: GroupDebtSummary["currencies"] = {};
  for (const [currency, graph] of graphs) {
    const simplified = simplifyDebts(memberBalances, currency);
    currencies[currency] = {
      currency,
      direct: toEntries(graph, currency),
      simplified,
      debts: simplified,
    };
  }

  return { currencies, memberBalances };
}

export function applySettlement(
  summary: GroupDebtSummary,
  settlement: DebtEntry,
): GroupDebtSummary {
  const { fromGroupMemberId, toGroupMemberId, currency, amountInCents } =
    settlement;

  const memberBalances: MemberBalances = Object.fromEntries(
    Object.entries(summary.memberBalances).map(([id, balances]) => [
      id,
      { ...balances },
    ]),
  );
  adjustBalance(memberBalances, fromGroupMemberId, currency, amountInCents);
  adjustBalance(memberBalances, toGroupMemberId, currency, -amountInCents);

  const graph: DebtGraph = new Map();
  for (const debt of summary.currencies[currency]?.direct ?? []) {
    addDebt(
      graph,
      debt.fromGroupMemberId,
      debt.toGroupMemberId,
      debt.amountInCents,
    );
  }
  addDebt(graph, toGroupMemberId, fromGroupMemberId, amountInCents);
  const simplified = simplifyDebts(memberBalances, currency);

  return {
    memberBalances,
    currencies: {
      ...summary.currencies,
      [currency]: {
        currency,
        direct: toEntries(graph, currency),
        simplified,
        debts: simplified,
      },
    },
  };
}

export type DebtKind = "direct" | "simplified";

export interface CounterpartDebts {
  groupMemberId: number;
  /** Positive: they owe the member. Negative: the member owes them. */
  amounts: { amountInCents: number; debt: DebtEntry }[];
  direction: string;
}

const directionLabels = {
  direct: { owed: msg("debts.owesYou"), owing: msg("debts.youOwe") },
  simplified: { owed: msg("debts.paysYou"), owing: msg("debts.youPay") },
} satisfies Record<DebtKind, { owed: MessageKey; owing: MessageKey }>;

export function debtsFor(
  summary: GroupDebtSummary,
  memberId: number,
  kind: DebtKind,
  t: Translate,
): CounterpartDebts[] {
  const byCounterpart = new Map<number, CounterpartDebts["amounts"]>();
  for (const entry of Object.values(summary.currencies)) {
    for (const debt of entry[kind]) {
      const owedToMember = debt.toGroupMemberId === memberId;
      if (!owedToMember && debt.fromGroupMemberId !== memberId) continue;
      const other = owedToMember
        ? debt.fromGroupMemberId
        : debt.toGroupMemberId;
      const amounts = byCounterpart.get(other) ?? [];
      amounts.push({
        amountInCents: owedToMember ? debt.amountInCents : -debt.amountInCents,
        debt,
      });
      byCounterpart.set(other, amounts);
    }
  }
  const largest = (amounts: CounterpartDebts["amounts"]) =>
    Math.max(...amounts.map(({ amountInCents }) => Math.abs(amountInCents)));
  const { owed, owing } = directionLabels[kind];
  return [...byCounterpart]
    .sort(([, a], [, b]) => largest(b) - largest(a))
    .map(([groupMemberId, amounts]) => ({
      groupMemberId,
      amounts,
      direction: [
        amounts.some(({ amountInCents }) => amountInCents > 0) && t(owed),
        amounts.some(({ amountInCents }) => amountInCents < 0) && t(owing),
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

export function debtsBetweenOthers(
  summary: GroupDebtSummary,
  memberId: number,
  kind: DebtKind,
): DebtEntry[] {
  return Object.values(summary.currencies).flatMap((entry) =>
    entry[kind]
      .filter(
        ({ fromGroupMemberId, toGroupMemberId }) =>
          fromGroupMemberId !== memberId && toGroupMemberId !== memberId,
      )
      .sort((a, b) => b.amountInCents - a.amountInCents),
  );
}

/** Prefers the payer's own debt to the receiver over the reverse direction */
export function pairDebt(
  summary: GroupDebtSummary,
  payer: number,
  receiver: number,
  currency?: string,
): DebtEntry | undefined {
  const between = Object.values(summary.currencies)
    .filter((entry) => currency === undefined || entry.currency === currency)
    .flatMap(({ direct }) => direct)
    .filter(
      ({ fromGroupMemberId: from, toGroupMemberId: to }) =>
        (from === payer && to === receiver) ||
        (from === receiver && to === payer),
    );
  return between.find((debt) => debt.fromGroupMemberId === payer) ?? between[0];
}

export function hasDebts(summary: GroupDebtSummary): boolean {
  return Object.values(summary.currencies).some(
    ({ direct }) => direct.length > 0,
  );
}

export function groupBalances(summary: GroupDebtSummary, meId: number) {
  const { memberBalances } = summary;
  const balances = Object.values(memberBalances);
  const memberIds = new Set([...Object.keys(memberBalances).map(Number), meId]);

  return Object.values(summary.currencies)
    .filter(({ currency }) =>
      balances.some((byCurrency) => (byCurrency[currency] ?? 0) !== 0),
    )
    .map(({ currency }) => {
      const rows = [...memberIds]
        .map((memberId) => ({
          memberId,
          isMe: memberId === meId,
          cents: memberBalances[memberId]?.[currency] ?? 0,
        }))
        .filter(({ isMe, cents }) => cents !== 0 || isMe)
        .sort((a, b) => b.cents - a.cents);
      const scale = Math.max(...rows.map(({ cents }) => Math.abs(cents)), 1);
      return {
        currency,
        rows: rows.map((row) => ({
          ...row,
          percent: (Math.abs(row.cents) / scale) * 100,
        })),
      };
    });
}

function adjustBalance(
  memberBalances: MemberBalances,
  memberId: number,
  currency: string,
  delta: number,
) {
  const balances = memberBalances[memberId] ?? {};
  balances[currency] = (balances[currency] ?? 0) + delta;
  memberBalances[memberId] = balances;
}

function setDebt(graph: DebtGraph, from: number, to: number, amount: number) {
  if (amount <= 0) {
    graph.get(from)?.delete(to);
    return;
  }
  const creditors = graph.get(from) ?? new Map<number, number>();
  creditors.set(to, amount);
  graph.set(from, creditors);
}

/** Nets against the opposite direction, so a pair only ever has one edge */
function addDebt(graph: DebtGraph, from: number, to: number, amount: number) {
  const net =
    (graph.get(from)?.get(to) ?? 0) - (graph.get(to)?.get(from) ?? 0) + amount;
  setDebt(graph, from, to, net);
  setDebt(graph, to, from, -net);
}

function toEntries(graph: DebtGraph, currency: string): DebtEntry[] {
  return [...graph]
    .flatMap(([from, creditors]) =>
      [...creditors].map(([to, amountInCents]) => ({
        fromGroupMemberId: from,
        toGroupMemberId: to,
        amountInCents,
        currency,
      })),
    )
    .sort(
      (a, b) =>
        a.fromGroupMemberId - b.fromGroupMemberId ||
        a.toGroupMemberId - b.toGroupMemberId,
    );
}

export function simplifyDebts(
  memberBalances: MemberBalances,
  currency: string,
): DebtEntry[] {
  const balances: { memberId: number; balance: number }[] = [];
  for (const [memberId, currencies] of Object.entries(memberBalances)) {
    const balance = currencies[currency] ?? 0;
    if (balance !== 0) {
      balances.push({ memberId: Number(memberId), balance });
    }
  }

  const creditors = balances
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < 0)
    .sort((a, b) => a.balance - b.balance);

  const debts: DebtEntry[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    if (!creditor || !debtor) break;

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

    debts.push({
      fromGroupMemberId: debtor.memberId,
      toGroupMemberId: creditor.memberId,
      amountInCents: amount,
      currency,
    });

    creditor.balance -= amount;
    debtor.balance += amount;

    if (creditor.balance === 0) {
      creditorIndex++;
    }
    if (debtor.balance === 0) {
      debtorIndex++;
    }
  }

  return debts;
}
