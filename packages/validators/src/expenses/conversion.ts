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
  // Leftover cents go by position, so rounding in member order keeps every screen on the same cent
  const shares = distributeShareAmounts(
    expenseSplits
      .map((split) => ({
        groupMemberId: split.groupMemberId,
        shares: split.amountInCents,
      }))
      .sort((a, b) => a.groupMemberId - b.groupMemberId),
    convertedAmountInCents,
    0,
  );
  return {
    amountInCents: convertedAmountInCents,
    currency: convertedCurrency,
    expenseSplits: expenseSplits.map(({ groupMemberId }) => ({
      groupMemberId,
      amountInCents:
        shares.find((share) => share.groupMemberId === groupMemberId)
          ?.amountInCents ?? 0,
    })),
  };
}

interface ConversionGroup {
  currency: string;
  convertAutomatically: boolean | null;
}

export function isLeftUnconverted(
  expense: Pick<ConvertibleExpense, "currency" | "convertedCurrency"> & {
    splitMethod: string;
  },
  group: ConversionGroup,
): boolean {
  return (
    group.convertAutomatically === true &&
    expense.splitMethod !== "settlement" &&
    expense.convertedCurrency == null &&
    expense.currency !== group.currency
  );
}

/** The currencies the debts banner names, while no admin has decided on conversion yet */
export function undecidedDebtCurrencies(
  group: ConversionGroup & { thisGroupMember: { role: string } },
  balances: { currency: string }[],
): string[] | undefined {
  return group.thisGroupMember.role === "admin" &&
    group.convertAutomatically === null &&
    balances.length > 1
    ? balances.map(({ currency }) => currency)
    : undefined;
}
