import type { ExpenseSplit, SplitMethod } from "./types";

export function distributeEqualAmounts(
  memberIds: number[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const memberCount = memberIds.length;
  if (memberCount === 0) return [];

  const baseAmount = Math.floor(totalAmountCents / memberCount);
  const remainder = totalAmountCents - baseAmount * memberCount;

  return memberIds.map((groupMemberId, index) => ({
    groupMemberId,
    amountInCents: baseAmount + (index < remainder ? 1 : 0),
    percentage: null,
  }));
}

export function emptySplit(groupMemberId: number): ExpenseSplit {
  return { groupMemberId, amountInCents: 0, percentage: null };
}

export function distributePercentageAmounts(
  splits: Pick<ExpenseSplit, "groupMemberId" | "percentage">[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const totalBasisPoints = splits.reduce(
    (sum, s) => sum + (s.percentage ?? 0),
    0,
  );
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
  splits: Pick<ExpenseSplit, "groupMemberId" | "shares">[],
  totalAmountCents: number,
  missingShares: number,
): ExpenseSplit[] {
  const counts = splits.map((s) => s.shares ?? missingShares);
  const totalShares = counts.reduce((sum, count) => sum + count, 0);
  const amounts = roundByLargestRemainder(
    counts.map((count) =>
      totalShares > 0 ? (count / totalShares) * totalAmountCents : 0,
    ),
    totalShares > 0 ? totalAmountCents : 0,
  );

  return splits.map((split, i) => ({
    groupMemberId: split.groupMemberId,
    amountInCents: amounts[i] ?? 0,
    percentage: null,
    shares: counts[i],
  }));
}

export function splitsForStorage(
  method: SplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  return method === "shares"
    ? distributeShareAmounts(splits, totalAmountCents, 0)
    : splits.map((s) => ({ ...s, shares: null }));
}

function roundByLargestRemainder(
  rawAmounts: number[],
  totalAmountCents: number,
): number[] {
  const flooredAmounts = rawAmounts.map((a) => Math.floor(a));
  const currentSum = flooredAmounts.reduce((a, b) => a + b, 0);
  let remainder = totalAmountCents - currentSum;

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
