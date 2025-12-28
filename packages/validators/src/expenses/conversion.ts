// ============================================================================
// Conversion Utilities - Cents ↔ Decimal
// ============================================================================

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
