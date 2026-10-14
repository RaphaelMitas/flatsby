// ============================================================================
// Validation Utilities - Check splits before saving
// ============================================================================

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
  // Basic validation
  if (splits.length === 0) {
    return {
      isValid: false,
      error: { key: msg("expenses.validation.atLeastOnePerson") },
    };
  }

  // Check for duplicate members
  const memberIds = splits.map((s) => s.groupMemberId);
  const uniqueMemberIds = new Set(memberIds);
  if (uniqueMemberIds.size !== memberIds.length) {
    return {
      isValid: false,
      error: { key: msg("expenses.validation.duplicateMembers") },
    };
  }

  // Check for negative amounts
  if (splits.some((s) => (s.amountInCents ?? 0) < 0)) {
    return {
      isValid: false,
      error: { key: msg("expenses.validation.negativeAmounts") },
    };
  }

  // Settlement validation - must have exactly one recipient
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
    // For equal splits, we calculate the expected amounts and verify the sum
    // The actual amounts should be calculated using distributeEqualAmounts
    // Here we just verify that if amounts exist, they sum correctly
    const totalSplitCents = splits.reduce(
      (sum, split) => sum + (split.amountInCents ?? 0),
      0,
    );

    // If amounts are provided, verify they sum to total
    if (totalSplitCents > 0 && totalSplitCents !== totalAmountCents) {
      return {
        isValid: false,
        error: splitSumError(totalAmountCents, totalSplitCents),
      };
    }

    return { isValid: true };
  }

  if (method === "percentage") {
    // Percentages are stored in basis points (100% = 10000)
    const totalBasisPoints = splits.reduce(
      (sum, split) => sum + (split.percentage ?? 0),
      0,
    );

    // Allow tolerance of 1 basis point for rounding
    if (Math.abs(totalBasisPoints - 10000) > 1) {
      return {
        isValid: false,
        error: {
          key: msg("expenses.validation.percentagesMustSum"),
          values: { percent: totalBasisPoints / 100 },
        },
      };
    }

    // Also verify amounts sum correctly if provided
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

  // Share amounts are derived from the counts on save, so only the counts can be wrong
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
  // Settlement validation
  if (splitMethod === "settlement") {
    if (splits.length !== 1) {
      return {
        valid: false,
        error: "settlement splits must be exactly 1",
        userMessage: msg("expenses.validation.settlementOneRecipient"),
      };
    }
  }

  // Empty splits validation
  if (splits.length === 0) {
    return {
      valid: false,
      error: "splits array is empty",
      userMessage: msg("expenses.validation.atLeastOnePersonInSplit"),
    };
  }

  // Negative amount validation
  if (splits.some((s) => s.amountInCents < 0)) {
    return {
      valid: false,
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

  // Sum validation - strict, no tolerance
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

/**
 * Validate that an array of splits has unique member IDs
 */
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

/**
 * Combined validation for expense splits with all checks
 */
export function validateExpenseSplitsFull(params: {
  splits: ExpenseSplit[];
  totalAmountCents: number;
  method: SplitMethod;
}): SplitValidationResult {
  const { splits, totalAmountCents, method } = params;

  // Unique member check
  const uniqueCheck = validateUniqueMemberIds(splits);
  if (!uniqueCheck.isValid) {
    return uniqueCheck;
  }

  // Method-specific validation (includes settlement check)
  return validateSplits({ splits, totalAmountCents, method });
}
