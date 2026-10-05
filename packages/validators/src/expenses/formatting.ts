// ============================================================================
// Formatting Utilities - Currency and Date Display
// ============================================================================

import { centsToDecimal } from "./conversion";

/**
 * Format currency amount with currency symbol
 * @param params.amountDecimal - Amount in decimal (not cents)
 * @param params.currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @param params.locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string (e.g., "$10.50" or "€10.50")
 */
export function formatCurrency({
  amountDecimal,
  currency,
  locale = "en-US",
}: {
  amountDecimal: number;
  currency: string;
  locale?: Intl.LocalesArgument;
}): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountDecimal);
}

/**
 * Format currency amount from cents
 * @param params.cents - Amount in cents
 * @param params.currency - ISO 4217 currency code
 * @param params.locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string
 */
export function formatCurrencyFromCents({
  cents,
  currency,
  locale,
}: {
  cents: number;
  currency: string;
  locale?: Intl.LocalesArgument;
}): string {
  return formatCurrency({
    amountDecimal: centsToDecimal(cents),
    currency,
    locale,
  });
}

/**
 * Format an expense date for list and card views
 * The year is omitted for expenses in the current year to keep rows compact.
 * @param date - Date the expense was incurred
 * @param locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string (e.g., "Mar 4" or "Mar 4, 2024")
 */
export function formatExpenseDateShort(
  date: Date,
  locale: Intl.LocalesArgument = "en-US",
): string {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format an expense date for detail views
 * @param date - Date the expense was incurred
 * @param locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string (e.g., "Monday, March 4, 2024")
 */
export function formatExpenseDateLong(
  date: Date,
  locale: Intl.LocalesArgument = "en-US",
): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Label for one member's portion of an expense
 * @returns "2 of 3 shares" for share splits, otherwise the percentage (e.g., "66.7%")
 */
export function formatSplitPortion({
  split,
  expense,
}: {
  split: { amountInCents: number; shares?: number | null };
  expense: {
    amountInCents: number;
    splitMethod: string;
    expenseSplits: { shares?: number | null }[];
  };
}): string {
  if (expense.splitMethod === "shares") {
    const totalShares = expense.expenseSplits.reduce(
      (sum, s) => sum + (s.shares ?? 0),
      0,
    );
    return `${split.shares ?? 0} of ${totalShares} ${totalShares === 1 ? "share" : "shares"}`;
  }
  const percentage =
    expense.amountInCents === 0
      ? 0
      : (split.amountInCents / expense.amountInCents) * 100;
  return `${percentage.toFixed(1)}%`;
}
