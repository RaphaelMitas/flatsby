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
import { MAX_SHARES } from "./types";
import { validateSplits } from "./validation";

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
  switch (method) {
    case "percentage":
      return distributePercentageAmounts(
        derivePercentagesFromAmounts(splits, totalAmountCents),
        totalAmountCents,
      );
    case "shares":
      return distributeShareAmounts(
        splits.map((s) => ({ groupMemberId: s.groupMemberId, shares: 1 })),
        totalAmountCents,
      );
    case "equal":
    case "custom":
      return splitsForTotal(method, splits, totalAmountCents);
  }
}

function splitsWithMemberToggled(
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
  return method === "percentage"
    ? evenPercentages(
        next.map((s) => s.groupMemberId),
        totalAmountCents,
      )
    : splitsForTotal(method, next, totalAmountCents);
}

export function splitEditor({
  splits,
  getSplits,
  setSplits,
  method,
  onMethodChange,
  totalAmountCents,
}: {
  splits: ExpenseSplit[];
  getSplits: () => ExpenseSplit[];
  setSplits: (splits: ExpenseSplit[]) => void;
  method: EditableSplitMethod;
  onMethodChange: (method: EditableSplitMethod) => void;
  totalAmountCents: number;
}) {
  const update = (fn: (current: ExpenseSplit[]) => ExpenseSplit[]) =>
    setSplits(fn(getSplits()));
  const replaceAt = (index: number, patch: Partial<ExpenseSplit>) =>
    getSplits().map((s, i) => (i === index ? { ...s, ...patch } : s));

  return {
    validation: validateSplits({ splits, totalAmountCents, method }),
    totalSplitCents: splits.reduce((sum, s) => sum + s.amountInCents, 0),
    totalShares: splits.reduce((sum, s) => sum + (s.shares ?? 0), 0),
    changeMethod: (next: EditableSplitMethod) => {
      update((current) => splitsForMethod(next, current, totalAmountCents));
      onMethodChange(next);
    },
    toggleMember: (memberId: number) =>
      update((current) =>
        splitsWithMemberToggled(method, current, memberId, totalAmountCents),
      ),
    setPercentage: (index: number, percentage: number) =>
      setSplits(
        distributePercentageAmounts(
          replaceAt(index, { percentage }).map((s) => ({
            groupMemberId: s.groupMemberId,
            percentage: s.percentage ?? 0,
          })),
          totalAmountCents,
        ),
      ),
    setShares: (index: number, shares: number) =>
      setSplits(
        splitsForTotal(
          "shares",
          replaceAt(index, {
            shares: Math.min(Math.max(shares, 0), MAX_SHARES),
          }),
          totalAmountCents,
        ),
      ),
    setAmount: (index: number, amountInCents: number) =>
      setSplits(replaceAt(index, { amountInCents })),
  };
}
