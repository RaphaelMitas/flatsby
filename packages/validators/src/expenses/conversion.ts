// ============================================================================
// Conversion Utilities - Cents ↔ Decimal, and between currencies
// ============================================================================

import { distributeShareAmounts } from "./distribution";

/**
 * Convert cents to decimal for display
 * @param cents - Amount in cents (integer)
 * @returns Decimal amount (e.g., 1050 -> 10.50)
 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}

/**
 * Convert decimal to cents for storage
 * @param decimal - Decimal amount (e.g., 10.50)
 * @returns Amount in cents (integer, e.g., 1050)
 */
export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

export function convertCents(cents: number, rate: number): number {
  return Math.round(cents * rate);
}

export function rateBetween(cents: number, convertedCents: number): number {
  return convertedCents / cents;
}

export interface ConvertibleExpense {
  amountInCents: number;
  currency: string;
  convertedAmountInCents?: number | null;
  convertedCurrency?: string | null;
  expenseSplits: { groupMemberId: number; amountInCents: number }[];
}

/** The amount, currency and splits an expense counts as in the debts */
export function inLedgerCurrency({
  amountInCents,
  currency,
  convertedAmountInCents,
  convertedCurrency,
  expenseSplits,
}: ConvertibleExpense): Pick<
  ConvertibleExpense,
  "amountInCents" | "currency" | "expenseSplits"
> {
  if (convertedAmountInCents == null || convertedCurrency == null) {
    return { amountInCents, currency, expenseSplits };
  }
  return {
    amountInCents: convertedAmountInCents,
    currency: convertedCurrency,
    expenseSplits: distributeShareAmounts(
      expenseSplits.map((split) => ({
        groupMemberId: split.groupMemberId,
        shares: split.amountInCents,
      })),
      convertedAmountInCents,
      0,
    ),
  };
}
