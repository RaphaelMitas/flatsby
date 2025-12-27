// ============================================================================
// Validation Utilities - Verify splits sum correctly
// ============================================================================

import type {
  ExpenseSplit,
  SplitMethod,
  SplitValidationResult,
  StrictValidationResult,
} from "./types";
import { formatCurrencyFromCents } from "./formatting";

/**
 * Validate expense splits based on split method
 * All methods now verify that amounts sum correctly to the total
 *
 * @param params.splits - Array of split objects with groupMemberId and amounts in cents
 * @param params.totalAmountCents - Total expense amount in cents
 * @param params.method - Split method: "equal", "percentage", or "custom"
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSplits({
  splits,
  totalAmountCents,
  method,
}: {
  splits: {
    groupMemberId: number;
    amountInCents?: number;
    percentage: number | null;
  }[];
  totalAmountCents: number;
  method: SplitMethod;
}): SplitValidationResult {
  // Basic validation
  if (splits.length === 0) {
    return { isValid: false, error: "At least one person must be included" };
  }

  // Check for duplicate members
  const memberIds = splits.map((s) => s.groupMemberId);
  const uniqueMemberIds = new Set(memberIds);
  if (uniqueMemberIds.size !== memberIds.length) {
    return { isValid: false, error: "Duplicate members are not allowed" };
  }

  // Check for negative amounts
  if (splits.some((s) => (s.amountInCents ?? 0) < 0)) {
    return { isValid: false, error: "Negative amounts are not allowed" };
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
        error: `Split amounts must sum to ${formatCurrencyFromCents({ cents: totalAmountCents, currency: "EUR" })} (currently ${formatCurrencyFromCents({ cents: totalSplitCents, currency: "EUR" })})`,
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
      const percentDisplay = (totalBasisPoints / 100).toFixed(2);
      return {
        isValid: false,
        error: `Percentages must sum to 100% (currently ${percentDisplay}%)`,
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
        error: `Split amounts must sum to ${formatCurrencyFromCents({ cents: totalAmountCents, currency: "EUR" })} (currently ${formatCurrencyFromCents({ cents: totalSplitCents, currency: "EUR" })})`,
      };
    }

    return { isValid: true };
  }

  // Custom splits
  const totalSplitCents = splits.reduce(
    (sum, split) => sum + (split.amountInCents ?? 0),
    0,
  );

  // No tolerance for custom splits - must match exactly
  if (totalSplitCents !== totalAmountCents) {
    return {
      isValid: false,
      error: `Split amounts must sum to ${formatCurrencyFromCents({ cents: totalAmountCents, currency: "EUR" })} (currently ${formatCurrencyFromCents({ cents: totalSplitCents, currency: "EUR" })})`,
    };
  }

  return { isValid: true };
}

/**
 * Strict validation for expense splits (server-side)
 * No tolerance for rounding - amounts must sum exactly
 *
 * @param expenseAmountInCents - Total expense amount in cents
 * @param splits - Array of splits with amountInCents
 * @param isSettlement - Whether this is a settlement (requires exactly 1 split)
 * @returns Validation result with error details if invalid
 */
export function validateExpenseSplitsStrict(
  expenseAmountInCents: number,
  splits: { amountInCents: number }[],
  isSettlement: boolean,
): StrictValidationResult {
  // Settlement validation
  if (isSettlement) {
    if (splits.length !== 1) {
      return {
        valid: false,
        error: "settlement splits must be exactly 1",
        userMessage: "Settlement must have exactly one recipient",
      };
    }
  }

  // Empty splits validation
  if (splits.length === 0) {
    return {
      valid: false,
      error: "splits array is empty",
      userMessage: "At least one person must be included in the split",
    };
  }

  // Negative amount validation
  if (splits.some((s) => s.amountInCents < 0)) {
    return {
      valid: false,
      error: "negative amount in splits",
      userMessage: "Split amounts cannot be negative",
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
      error: `split amounts (${totalSplitAmount} cents) must sum to expense amount (${expenseAmountInCents} cents)`,
      userMessage: "The split amounts don't match the total expense amount",
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
      error: "Each member can only appear once in the split",
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
  isSettlement?: boolean;
}): SplitValidationResult {
  const { splits, totalAmountCents, method, isSettlement = false } = params;

  // Settlement check
  if (isSettlement && splits.length !== 1) {
    return {
      isValid: false,
      error: "Settlement must have exactly one recipient",
    };
  }

  // Unique member check
  const uniqueCheck = validateUniqueMemberIds(splits);
  if (!uniqueCheck.isValid) {
    return uniqueCheck;
  }

  // Method-specific validation
  return validateSplits({ splits, totalAmountCents, method });
}
