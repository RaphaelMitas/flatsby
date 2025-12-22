/**
 * Utility functions for expense management
 * Handles conversion between cents and decimal amounts, currency formatting, and split validation
 */

import { GroupMemberWithUserInfo } from "node_modules/@flatsby/api/dist/types";

/**
 * Convert cents to decimal amount for display
 * @param cents - Amount in cents (integer)
 * @returns Decimal amount (e.g., 1050 -> 10.50)
 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}

/**
 * Convert decimal amount to cents for API/storage
 * @param decimal - Decimal amount (e.g., 10.50)
 * @returns Amount in cents (integer, e.g., 1050)
 */
export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

/**
 * Format currency amount with currency symbol
 * @param amount - Amount in decimal (not cents)
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @returns Formatted string (e.g., "$10.50" or "€10.50")
 */
export function formatCurrency(amount: number, currency: string): string {
  // Use Intl.NumberFormat for proper currency formatting
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency amount from cents
 * @param cents - Amount in cents
 * @param currency - ISO 4217 currency code
 * @returns Formatted string
 */
export function formatCurrencyFromCents(
  cents: number,
  currency: string,
): string {
  return formatCurrency(centsToDecimal(cents), currency);
}

/**
 * Validate expense splits based on split method
 * @param splits - Array of split objects with groupMemberId and optional amount/percentage
 * @param totalAmount - Total expense amount in decimal
 * @param method - Split method: "equal", "percentage", or "custom"
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSplits(
  splits: {
    groupMemberId: number;
    amount?: number;
    percentage: number | null;
  }[],
  totalAmount: number,
  method: "equal" | "percentage" | "custom",
): { isValid: boolean; error?: string } {
  if (splits.length === 0) {
    return { isValid: false, error: "At least one person must be included" };
  }

  if (method === "equal") {
    // Equal splits are always valid if there are members
    return { isValid: true };
  }

  if (method === "percentage") {
    const totalPercentage = splits.reduce(
      (sum, split) => sum + (split.percentage ?? 0),
      0,
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        isValid: false,
        error: `Percentages must sum to 100% (currently ${totalPercentage.toFixed(2)}%)`,
      };
    }
    return { isValid: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (method === "custom") {
    const totalSplitAmount = splits.reduce(
      (sum, split) => sum + (split.amount ?? 0),
      0,
    );
    if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
      return {
        isValid: false,
        error: `Split amounts must sum to ${formatCurrency(totalAmount, "USD")} (currently ${formatCurrency(totalSplitAmount, "USD")})`,
      };
    }
    return { isValid: true };
  }

  return { isValid: false, error: "Invalid split method" };
}

export function percentageToAmount(totalAmount: number, percentage: number) {
  return (percentage / 1000) * totalAmount;
}

export function calculateEvenPercentage(
  groupMembers: GroupMemberWithUserInfo[],
) {
  const totalPercentageRoundedToTwoDecimals = Math.floor(
    (100 / groupMembers.length) * 100,
  );

  let remainingPercentage =
    10000 - totalPercentageRoundedToTwoDecimals * groupMembers.length;
  const groupMemberPercentage = groupMembers.map((groupMember) => {
    return {
      groupMemberId: groupMember.id,
      percentage: totalPercentageRoundedToTwoDecimals,
    };
  });

  //give rest in round robin to group members
  let groupMemberIndex = 0;
  while (remainingPercentage > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    groupMemberPercentage[groupMemberIndex]!.percentage += 1;
    remainingPercentage -= 1;
    groupMemberIndex = (groupMemberIndex + 1) % groupMembers.length;
  }

  return groupMemberPercentage.map((groupMember) => {
    return {
      groupMemberId: groupMember.groupMemberId,
      percentage: groupMember.percentage,
    };
  });
}

export function calculateEvenPercentageAmount(
  groupMembers: GroupMemberWithUserInfo[],
  totalAmount: number,
) {
  const evenPercentage = calculateEvenPercentage(groupMembers);
  return evenPercentage.map((groupMember) => {
    return {
      groupMemberId: groupMember.groupMemberId,
      amount: percentageToAmount(totalAmount, groupMember.percentage),
      percentage: groupMember.percentage,
    };
  });
}
