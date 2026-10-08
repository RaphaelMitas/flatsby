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

/**
 * Distribute an amount based on percentages (in basis points)
 * Uses largest remainder method to distribute rounding errors fairly
 *
 * @param splits - Array of splits with groupMemberId and percentage (basis points)
 * @param totalAmountCents - Total amount in cents (integer)
 * @returns Array of ExpenseSplit with amounts that sum exactly to totalAmountCents
 *
 * @example
 * distributePercentageAmounts(
 *   [{ groupMemberId: 1, percentage: 3333 }, { groupMemberId: 2, percentage: 3333 }, { groupMemberId: 3, percentage: 3334 }],
 *   100
 * )
 * // Correctly handles rounding to ensure sum equals 100
 */
export function distributePercentageAmounts(
  splits: { groupMemberId: number; percentage: number }[],
  totalAmountCents: number,
): ExpenseSplit[] {
  if (splits.length === 0) return [];

  // Calculate raw amounts (may have fractional cents)
  const rawAmounts = splits.map(
    (s) => (s.percentage / 10000) * totalAmountCents,
  );

  // Floor all amounts
  const flooredAmounts = rawAmounts.map((a) => Math.floor(a));
  const currentSum = flooredAmounts.reduce((a, b) => a + b, 0);
  let remainder = totalAmountCents - currentSum;

  // Sort by fractional part descending to distribute remainder fairly
  const indexed = rawAmounts.map((raw, i) => ({
    index: i,
    fractionalPart: raw - Math.floor(raw),
  }));
  indexed.sort((a, b) => b.fractionalPart - a.fractionalPart);

  // Distribute remainder to entries with largest fractional parts
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

/**
 * Convert percentage in basis points to amount in cents
 * Note: This function is for display/calculation purposes only.
 * For actual distribution, use distributePercentageAmounts to avoid rounding issues.
 *
 * @param totalAmountCents - Total amount in cents
 * @param percentageBasisPoints - Percentage in basis points (100% = 10000)
 * @returns Amount in cents (rounded)
 */
export function percentageToAmountCents(
  totalAmountCents: number,
  percentageBasisPoints: number,
): number {
  return Math.round((percentageBasisPoints / 10000) * totalAmountCents);
}
