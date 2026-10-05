// ============================================================================
// Split Editing - Pure transitions for the split editor on both clients
// ============================================================================

import type { ExpenseSplit, SplitMethod } from "./types";
import {
  calculateEvenPercentageBasisPoints,
  derivePercentagesFromAmounts,
  distributeEqualAmounts,
  distributePercentageAmounts,
  distributeShareAmounts,
} from "./distribution";

export type EditableSplitMethod = Exclude<SplitMethod, "settlement">;

function evenPercentages(
  memberIds: number[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const basisPoints = calculateEvenPercentageBasisPoints(memberIds.length);
  return distributePercentageAmounts(
    memberIds.map((groupMemberId, i) => ({
      groupMemberId,
      percentage: basisPoints[i] ?? 0,
    })),
    totalAmountCents,
  );
}

/** Runs when the total changes and on submit, so it is the shape the API receives */
export function splitsForTotal(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const memberIds = splits.map((s) => s.groupMemberId);
  switch (method) {
    case "equal":
      return distributeEqualAmounts(memberIds, totalAmountCents);
    case "percentage":
      return splits.some((s) => (s.percentage ?? 0) > 0)
        ? distributePercentageAmounts(
            splits.map((s) => ({
              groupMemberId: s.groupMemberId,
              percentage: s.percentage ?? 0,
            })),
            totalAmountCents,
          )
        : evenPercentages(memberIds, totalAmountCents);
    case "shares":
      return distributeShareAmounts(
        splits.map((s) => ({
          groupMemberId: s.groupMemberId,
          shares: s.shares ?? 1,
        })),
        totalAmountCents,
      );
    case "custom":
      return splits.map((s) => ({
        groupMemberId: s.groupMemberId,
        amountInCents: s.amountInCents,
        percentage: null,
      }));
  }
}

export function splitsForMethod(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const memberIds = splits.map((s) => s.groupMemberId);
  switch (method) {
    case "equal":
      return distributeEqualAmounts(memberIds, totalAmountCents);
    case "percentage":
      return distributePercentageAmounts(
        derivePercentagesFromAmounts(splits, totalAmountCents),
        totalAmountCents,
      );
    case "shares":
      return distributeShareAmounts(
        memberIds.map((groupMemberId) => ({ groupMemberId, shares: 1 })),
        totalAmountCents,
      );
    case "custom":
      return splits;
  }
}

export function splitsWithMemberToggled(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  memberId: number,
  totalAmountCents: number,
): ExpenseSplit[] {
  const next = splits.some((s) => s.groupMemberId === memberId)
    ? splits.filter((s) => s.groupMemberId !== memberId)
    : [
        ...splits,
        { groupMemberId: memberId, amountInCents: 0, percentage: null },
      ];
  if (next.length === 0) return [];

  switch (method) {
    case "equal":
      return distributeEqualAmounts(
        next.map((s) => s.groupMemberId),
        totalAmountCents,
      );
    case "percentage":
      return evenPercentages(
        next.map((s) => s.groupMemberId),
        totalAmountCents,
      );
    case "shares":
      return splitsForTotal("shares", next, totalAmountCents);
    case "custom":
      return next;
  }
}

export function splitsWithPercentage(
  splits: ExpenseSplit[],
  index: number,
  basisPoints: number,
  totalAmountCents: number,
): ExpenseSplit[] {
  return distributePercentageAmounts(
    splits.map((s, i) => ({
      groupMemberId: s.groupMemberId,
      percentage: i === index ? basisPoints : (s.percentage ?? 0),
    })),
    totalAmountCents,
  );
}

export function splitsWithShares(
  splits: ExpenseSplit[],
  index: number,
  shares: number,
  totalAmountCents: number,
): ExpenseSplit[] {
  return distributeShareAmounts(
    splits.map((s, i) => ({
      groupMemberId: s.groupMemberId,
      shares: i === index ? shares : (s.shares ?? 1),
    })),
    totalAmountCents,
  );
}
