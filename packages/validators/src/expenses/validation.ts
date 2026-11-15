import { msg } from "@flatsby/i18n/message-key";

import type {
  ExpenseSplit,
  SplitMethod,
  SplitValidationResult,
  StrictValidationResult,
} from "./types";
import { centsToDecimal } from "./conversion";

function splitSumError(totalCents: number, currentCents: number) {
  return {
    key: msg("expenses.validation.splitAmountsMustSum"),
    values: {
      total: centsToDecimal(totalCents),
      current: centsToDecimal(currentCents),
    },
  };
}

function hasMissingShares(splits: { shares?: number | null }[]): boolean {
  return splits.some((s) => !Number.isInteger(s.shares) || (s.shares ?? 0) < 1);
}

export function validateSplits({
  splits,
  totalAmountCents,
  method,
}: {
  splits: {
    groupMemberId: number;
    amountInCents?: number;
    percentage: number | null;
    shares?: number | null;
  }[];
  totalAmountCents: number;
  method: SplitMethod;
}): SplitValidationResult {
  if (splits.length === 0) {
    return {
      isValid: false,
      error: { key: msg("expenses.validation.atLeastOnePerson") },
    };
  }

  const memberIds = splits.map((s) => s.groupMemberId);
  const uniqueMemberIds = new Set(memberIds);
  if (uniqueMemberIds.size !== memberIds.length) {
    return {
      isValid: false,
      error: { key: msg("expenses.validation.duplicateMembers") },
    };
  }

  if (splits.some((s) => (s.amountInCents ?? 0) < 0)) {
    return {
      isValid: false,
      error: { key: msg("expenses.validation.negativeAmounts") },
    };
  }

  if (method === "settlement") {
    if (splits.length !== 1) {
      return {
        isValid: false,
        error: { key: msg("expenses.validation.settlementOneRecipient") },
      };
    }

    const totalSplitCents = splits.reduce(
      (sum, split) => sum + (split.amountInCents ?? 0),
      0,
    );

    if (totalSplitCents !== totalAmountCents) {
      return {
        isValid: false,
        error: {
          key: msg("expenses.validation.splitAmountMustEqual"),
          values: { total: centsToDecimal(totalAmountCents) },
        },
      };
    }

    return { isValid: true };
  }

  if (method === "equal") {
    const totalSplitCents = splits.reduce(
      (sum, split) => sum + (split.amountInCents ?? 0),
      0,
    );

    if (totalSplitCents > 0 && totalSplitCents !== totalAmountCents) {
      return {
        isValid: false,
        error: splitSumError(totalAmountCents, totalSplitCents),
      };
    }

    return { isValid: true };
  }

  if (method === "percentage") {
    const totalBasisPoints = splits.reduce(
      (sum, split) => sum + (split.percentage ?? 0),
      0,
    );

    if (Math.abs(totalBasisPoints - 10000) > 1) {
      return {
        isValid: false,
        error: {
          key: msg("expenses.validation.percentagesMustSum"),
          values: { percent: totalBasisPoints / 100 },
        },
      };
    }

    const totalSplitCents = splits.reduce(
      (sum, split) => sum + (split.amountInCents ?? 0),
      0,
    );

    if (totalSplitCents > 0 && totalSplitCents !== totalAmountCents) {
      return {
        isValid: false,
        error: splitSumError(totalAmountCents, totalSplitCents),
      };
    }

    return { isValid: true };
  }

  if (method === "shares") {
    return hasMissingShares(splits)
      ? {
          isValid: false,
          error: { key: msg("expenses.validation.eachPersonNeedsShare") },
        }
      : { isValid: true };
  }

  const totalSplitCents = splits.reduce(
    (sum, split) => sum + (split.amountInCents ?? 0),
    0,
  );

  if (totalSplitCents !== totalAmountCents) {
    return {
      isValid: false,
      error: splitSumError(totalAmountCents, totalSplitCents),
    };
  }

  return { isValid: true };
}

export function validateExpenseSplitsStrict(
  expenseAmountInCents: number,
  splits: { amountInCents: number; shares?: number | null }[],
  splitMethod: SplitMethod,
): StrictValidationResult {
  if (splitMethod === "settlement") {
    if (splits.length !== 1) {
      return {
        valid: false,
        error: "settlement splits must be exactly 1",
        userMessage: msg("expenses.validation.settlementOneRecipient"),
      };
    }
  }

  if (splits.length === 0) {
    return {
      valid: false,
      // i18n-ignore: developer detail, the user sees userMessage
      error: "splits array is empty",
      userMessage: msg("expenses.validation.atLeastOnePersonInSplit"),
    };
  }

  if (splits.some((s) => s.amountInCents < 0)) {
    return {
      valid: false,
      // i18n-ignore: developer detail, the user sees userMessage
      error: "negative amount in splits",
      userMessage: msg("expenses.validation.negativeSplitAmounts"),
    };
  }

  if (splitMethod === "shares" && hasMissingShares(splits)) {
    return {
      valid: false,
      error: "share splits need a share count of at least 1",
      userMessage: msg("expenses.validation.eachPersonNeedsShare"),
    };
  }

  const totalSplitAmount = splits.reduce(
    (sum, split) => sum + split.amountInCents,
    0,
  );

  if (totalSplitAmount !== expenseAmountInCents) {
    return {
      valid: false,
      // i18n-ignore: developer detail, the user sees userMessage
      error: `split amounts (${totalSplitAmount} cents) must sum to expense amount (${expenseAmountInCents} cents)`,
      userMessage: msg("expenses.validation.splitAmountsMismatch"),
    };
  }

  return { valid: true };
}

export function validateUniqueMemberIds(
  splits: { groupMemberId: number }[],
): SplitValidationResult {
  const memberIds = splits.map((s) => s.groupMemberId);
  const uniqueIds = new Set(memberIds);

  if (uniqueIds.size !== memberIds.length) {
    return {
      isValid: false,
      error: { key: msg("expenses.validation.memberOnce") },
    };
  }

  return { isValid: true };
}

export function validateExpenseSplitsFull(params: {
  splits: ExpenseSplit[];
  totalAmountCents: number;
  method: SplitMethod;
}): SplitValidationResult {
  const { splits, totalAmountCents, method } = params;

  const uniqueCheck = validateUniqueMemberIds(splits);
  if (!uniqueCheck.isValid) {
    return uniqueCheck;
  }

  return validateSplits({ splits, totalAmountCents, method });
}
