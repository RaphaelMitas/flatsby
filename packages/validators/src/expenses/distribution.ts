// ============================================================================
// Distribution Algorithms - Split amounts in cents
// ============================================================================

import type { ExpenseSplit, SplitMethod } from "./types";

/**
 * Distribute an amount equally among members
 * Handles remainders by giving extra cents to the first N members
 *
 * @param memberIds - Array of member IDs to split between
 * @param totalAmountCents - Total amount in cents (integer)
 * @returns Array of ExpenseSplit with amounts that sum exactly to totalAmountCents
 *
 * @example
 * distributeEqualAmounts([1, 2, 3], 100)
 * // Returns: [
 * //   { groupMemberId: 1, amountInCents: 34, percentage: null },
 * //   { groupMemberId: 2, amountInCents: 33, percentage: null },
 * //   { groupMemberId: 3, amountInCents: 33, percentage: null }
 * // ]
 * // Total: 34 + 33 + 33 = 100 ✓
 */
export function distributeEqualAmounts(
  memberIds: number[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const memberCount = memberIds.length;
  if (memberCount === 0) return [];

  // Calculate base amount and remainder
  const baseAmount = Math.floor(totalAmountCents / memberCount);
  const remainder = totalAmountCents - baseAmount * memberCount;

  return memberIds.map((groupMemberId, index) => ({
    groupMemberId,
    // First 'remainder' members get baseAmount + 1
    amountInCents: baseAmount + (index < remainder ? 1 : 0),
    percentage: null, // Equal splits don't store percentage
  }));
}

export function emptySplit(groupMemberId: number): ExpenseSplit {
  return { groupMemberId, amountInCents: 0, percentage: null };
}

/**
 * Distribute an amount based on percentages (in basis points) using the largest remainder method.
 * Amounts only sum to totalAmountCents once the percentages total 100%; partial input stays floored.
 */
export function distributePercentageAmounts(
  splits: Pick<ExpenseSplit, "groupMemberId" | "percentage">[],
  totalAmountCents: number,
): ExpenseSplit[] {
  if (splits.length === 0) return [];

  const totalBasisPoints = splits.reduce(
    (sum, s) => sum + (s.percentage ?? 0),
    0,
  );
  // Tolerance matches validateSplits; scaling by the entered total lets 99.99% still sum exactly
  const isComplete = Math.abs(totalBasisPoints - 10000) <= 1;
  const basis = isComplete ? totalBasisPoints : 10000;

  const rawAmounts = splits.map(
    (s) => ((s.percentage ?? 0) / basis) * totalAmountCents,
  );
  const flooredAmounts = rawAmounts.map((a) => Math.floor(a));
  const currentSum = flooredAmounts.reduce((a, b) => a + b, 0);
  let remainder = isComplete ? totalAmountCents - currentSum : 0;

  // Sort by fractional part descending to distribute remainder fairly
  const indexed = rawAmounts.map((raw, i) => ({
    index: i,
    fractionalPart: raw - Math.floor(raw),
  }));
  indexed.sort((a, b) => b.fractionalPart - a.fractionalPart);

  for (const { index } of indexed) {
    if (remainder <= 0) break;
    if (flooredAmounts[index] === undefined)
      throw new Error(`Invalid index in distributePercentageAmounts: ${index}`);

    flooredAmounts[index]++;
    remainder--;
  }

  return splits.map((split, i) => {
    if (flooredAmounts[i] === undefined)
      throw new Error(`Invalid index in distributePercentageAmounts: ${i}`);

    return {
      groupMemberId: split.groupMemberId,
      amountInCents: flooredAmounts[i],
      percentage: split.percentage,
    };
  });
}

// Blank members aren't part of the expense, so they're dropped instead of saved at 0
export function finalizeSplits(
  method: SplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  if (method === "equal") {
    return distributeEqualAmounts(
      splits.map((s) => s.groupMemberId),
      totalAmountCents,
    );
  }
  if (method === "percentage") {
    return distributePercentageAmounts(
      splits.filter((s) => s.percentage),
      totalAmountCents,
    );
  }
  return splits
    .filter((s) => s.amountInCents > 0)
    .map((s) => ({ ...s, percentage: null }));
}
