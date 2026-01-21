// ============================================================================
// Debt Calculation Utilities
// ============================================================================

import type { DebtEntry, DebtSummary, GroupDebtSummary } from "./types";

/**
 * Calculate debts from expenses and splits
 * Returns a summary with currency-grouped debts and member balances
 *
 * @param expenses - Array of expenses with splits
 * @returns GroupDebtSummary with debts and balances per currency
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
  const memberBalances: Record<number, Record<string, number>> = {};
  const currencies = new Set<string>();

  // Initialize balances for all members and currencies
  for (const expense of expenses) {
    currencies.add(expense.currency);
    const payerBalances = (memberBalances[expense.paidByGroupMemberId] ??= {});
    payerBalances[expense.currency] ??= 0;

    for (const split of expense.expenseSplits) {
      const splitterBalances = (memberBalances[split.groupMemberId] ??= {});
      splitterBalances[expense.currency] ??= 0;
    }
  }

  // Calculate net balances
  for (const expense of expenses) {
    const { paidByGroupMemberId, amountInCents, currency } = expense;
    const payerBalances = memberBalances[paidByGroupMemberId];
    if (payerBalances) {
      // Payer gets credited (positive balance)
      const currentBalance = payerBalances[currency];
      if (currentBalance !== undefined) {
        payerBalances[currency] = currentBalance + amountInCents;
      } else {
        payerBalances[currency] = amountInCents;
      }
    }

    // Splitters get debited (negative balance)
    for (const split of expense.expenseSplits) {
      const splitterBalances = memberBalances[split.groupMemberId];
      if (splitterBalances) {
        const currentBalance = splitterBalances[currency];
        if (currentBalance !== undefined) {
          splitterBalances[currency] = currentBalance - split.amountInCents;
        } else {
          splitterBalances[currency] = -split.amountInCents;
        }
      }
    }
  }

  // Simplify debts for each currency
  const currencyDebts: Record<string, DebtSummary> = {};
  for (const currency of currencies) {
    const debts = simplifyDebts(memberBalances, currency);
    currencyDebts[currency] = {
      debts,
      currency,
    };
  }

  return {
    currencies: currencyDebts,
    memberBalances,
  };
}

/**
 * Simplify debts using a greedy algorithm to minimize transactions
 *
 * @param memberBalances - Member balances per currency
 * @param currency - Currency to simplify debts for
 * @returns Array of simplified debt entries
 */
export function simplifyDebts(
  memberBalances: Record<number, Record<string, number>>,
  currency: string,
): DebtEntry[] {
  // Get all members with non-zero balances for this currency
  const balances: { memberId: number; balance: number }[] = [];
  for (const [memberId, currencies] of Object.entries(memberBalances)) {
    const balance = currencies[currency] ?? 0;
    if (balance !== 0) {
      balances.push({ memberId: Number(memberId), balance });
    }
  }

  // Separate creditors (positive) and debtors (negative)
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
