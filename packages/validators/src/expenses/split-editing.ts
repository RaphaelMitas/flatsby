// ============================================================================
// Split Editing - Pure transitions for the split editor on both clients
// ============================================================================

import type { ExpenseSplit, SplitMethod } from "./types";
import {
  distributeEqualAmounts,
  distributePercentageAmounts,
  distributeShareAmounts,
  emptySplit,
} from "./distribution";
import { splitMethodSchema } from "./schemas";
import { MAX_SHARES } from "./types";
import { validateSplits } from "./validation";

export type EditableSplitMethod = Exclude<SplitMethod, "settlement">;

export function isEditableSplitMethod(
  method: string | undefined,
): method is EditableSplitMethod {
  return splitMethodSchema.exclude(["settlement"]).safeParse(method).success;
}

export function splitsForTotal(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  switch (method) {
    case "equal":
      return distributeEqualAmounts(
        splits.map((s) => s.groupMemberId),
        totalAmountCents,
      );
    case "percentage":
      return distributePercentageAmounts(splits, totalAmountCents);
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

// Blank members aren't part of the expense, so they're dropped instead of saved at 0
export function finalizeSplits(
  method: SplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  if (method === "equal" || method === "shares") {
    return splitsForTotal(method, splits, totalAmountCents);
  }
  if (method === "percentage") {
    return splitsForTotal(
      method,
      splits.filter((s) => s.percentage),
      totalAmountCents,
    );
  }
  return splitsForTotal(
    "custom",
    splits.filter((s) => s.amountInCents > 0),
    totalAmountCents,
  );
}

function splitsForMethod(
  next: EditableSplitMethod,
  current: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  if (next === current && next !== "equal") return splits;
  return splitsForTotal(
    next,
    splits.map((s) => emptySplit(s.groupMemberId)),
    totalAmountCents,
  );
}

function splitsWithMemberToggled(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  memberId: number,
  totalAmountCents: number,
): ExpenseSplit[] {
  const next = splits.some((s) => s.groupMemberId === memberId)
    ? splits.filter((s) => s.groupMemberId !== memberId)
    : [...splits, emptySplit(memberId)];
  return method === "equal" || method === "shares"
    ? splitsForTotal(method, next, totalAmountCents)
    : next;
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
      update((current) =>
        splitsForMethod(next, method, current, totalAmountCents),
      );
      onMethodChange(next);
    },
    toggleMember: (memberId: number) =>
      update((current) =>
        splitsWithMemberToggled(method, current, memberId, totalAmountCents),
      ),
    setPercentage: (index: number, percentage: number) =>
      setSplits(
        distributePercentageAmounts(
          replaceAt(index, { percentage }),
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
