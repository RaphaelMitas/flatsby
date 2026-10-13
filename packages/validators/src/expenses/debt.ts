import type { DebtEntry, GroupDebtSummary, MemberBalances } from "./types";

/** debtor -> creditor -> cents, every amount positive */
type DebtGraph = Map<number, Map<number, number>>;

const ascending = (a: number, b: number) => a - b;

/**
 * Per currency: direct debts between each pair of members, with circular debts
 * cancelled, and the greedy simplified plan derived from member balances.
 */
export function calculateDebts(
  expenses: {
    paidByGroupMemberId: number;
    amountInCents: number;
    currency: string;
    expenseSplits: {
      groupMemberId: number;
      amountInCents: number;
    }[];
  }[],
): GroupDebtSummary {
  const memberBalances: MemberBalances = {};
  const graphs = new Map<string, DebtGraph>();

  for (const expense of expenses) {
    const { paidByGroupMemberId: payer, currency } = expense;
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
    cancelCycles(graph);
    currencies[currency] = {
      currency,
      direct: toEntries(graph, currency),
      simplified: simplifyDebts(memberBalances, currency),
    };
  }

  return { currencies, memberBalances };
}

/**
 * Optimistically applies a settlement payment to a summary. Direct debts are
 * adjusted for the pair only; the next server fetch re-cancels cycles.
 */
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

  return {
    memberBalances,
    currencies: {
      ...summary.currencies,
      [currency]: {
        currency,
        direct: toEntries(graph, currency),
        simplified: simplifyDebts(memberBalances, currency),
      },
    },
  };
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

function findCycle(graph: DebtGraph): number[] | undefined {
  const done = new Set<number>();
  const path: number[] = [];

  const visit = (member: number): number[] | undefined => {
    path.push(member);
    const creditors = [...(graph.get(member)?.keys() ?? [])].sort(ascending);
    for (const creditor of creditors) {
      const onPath = path.indexOf(creditor);
      if (onPath !== -1) return path.slice(onPath);
      if (done.has(creditor)) continue;
      const cycle = visit(creditor);
      if (cycle) return cycle;
    }
    path.pop();
    done.add(member);
    return undefined;
  };

  for (const member of [...graph.keys()].sort(ascending)) {
    if (done.has(member)) continue;
    const cycle = visit(member);
    if (cycle) return cycle;
  }
  return undefined;
}

/**
 * Removes circular debts (A owes B owes C owes A) by subtracting each cycle's
 * smallest edge along it. Balances are unchanged and no new pair appears.
 */
function cancelCycles(graph: DebtGraph) {
  for (let cycle = findCycle(graph); cycle; cycle = findCycle(graph)) {
    const hops = cycle.map((from, i) => {
      const to = cycle[(i + 1) % cycle.length] ?? from;
      return { from, to, amount: graph.get(from)?.get(to) ?? 0 };
    });
    const smallest = Math.min(...hops.map((hop) => hop.amount));
    for (const { from, to, amount } of hops) {
      setDebt(graph, from, to, amount - smallest);
    }
  }
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

/** Greedy plan that settles every balance in few payments */
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
