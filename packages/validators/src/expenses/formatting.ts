// ============================================================================
// Formatting Utilities - Currency Display
// ============================================================================

import { centsToDecimal } from "./conversion";

/**
 * Format currency amount with currency symbol
 * @param params.amountDecimal - Amount in decimal (not cents)
 * @param params.currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @param params.locale - Locale to use for formatting (default: "de-DE")
 * @returns Formatted string (e.g., "$10.50" or "€10.50")
 */
export function formatCurrency({
  amountDecimal,
  currency,
  locale = "de-DE",
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
 * @param params.locale - Locale to use for formatting (default: "de-DE")
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
