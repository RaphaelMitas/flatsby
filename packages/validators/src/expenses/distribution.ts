// ============================================================================
// Distribution Algorithms - Split amounts in cents
// ============================================================================

import type { ExpenseSplit } from "./types";

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
  const amounts = isComplete
    ? roundByLargestRemainder(rawAmounts, totalAmountCents)
    : rawAmounts.map((a) => Math.floor(a));

  return splits.map((split, i) => ({
    groupMemberId: split.groupMemberId,
    amountInCents: amounts[i] ?? 0,
    percentage: split.percentage,
  }));
}

export function distributeShareAmounts(
  splits: { groupMemberId: number; shares: number }[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const totalShares = splits.reduce((sum, s) => sum + s.shares, 0);
  const amounts = roundByLargestRemainder(
    splits.map((s) =>
      totalShares > 0 ? (s.shares / totalShares) * totalAmountCents : 0,
    ),
    totalShares > 0 ? totalAmountCents : 0,
  );

  return splits.map((split, i) => ({
    groupMemberId: split.groupMemberId,
    amountInCents: amounts[i] ?? 0,
    percentage: null,
    shares: split.shares,
  }));
}

function roundByLargestRemainder(
  rawAmounts: number[],
  totalAmountCents: number,
): number[] {
  const flooredAmounts = rawAmounts.map((a) => Math.floor(a));
  const currentSum = flooredAmounts.reduce((a, b) => a + b, 0);
  let remainder = totalAmountCents - currentSum;

  // Sort by fractional part descending to distribute remainder fairly
  const indexed = rawAmounts.map((raw, i) => ({
    index: i,
    fractionalPart: raw - Math.floor(raw),
  }));
  indexed.sort((a, b) => b.fractionalPart - a.fractionalPart);

  for (const { index } of indexed) {
    if (remainder <= 0) break;
    if (flooredAmounts[index] === undefined)
      throw new Error(`Invalid index in roundByLargestRemainder: ${index}`);

    flooredAmounts[index]++;
    remainder--;
  }

  return flooredAmounts;
}
