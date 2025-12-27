// ============================================================================
// Types for Expense Distribution and Validation
// ============================================================================

/**
 * Split method types
 */
export type SplitMethod = "equal" | "percentage" | "custom";

/**
 * Expense split with amount and optional percentage
 * - amountInCents: The actual amount in cents (always integer)
 * - percentage: Percentage in basis points (100% = 10000), nullable for equal/custom splits
 */
export interface ExpenseSplit {
  groupMemberId: number;
  amountInCents: number;
  percentage: number | null;
}

/**
 * Result of split validation
 */
export interface SplitValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Strict validation result with user-friendly message
 */
export type StrictValidationResult =
  | { valid: true }
  | { valid: false; error: string; userMessage: string };

/**
 * Debt entry between two members
 */
export interface DebtEntry {
  fromGroupMemberId: number;
  toGroupMemberId: number;
  amountInCents: number;
  currency: string;
}

/**
 * Debt summary for a single currency
 */
export interface DebtSummary {
  debts: DebtEntry[];
  currency: string;
}

/**
 * Group debt summary across all currencies
 */
export interface GroupDebtSummary {
  currencies: Record<string, DebtSummary>;
  memberBalances: Record<number, Record<string, number>>; // groupMemberId -> currency -> balance in cents
}

/**
 * Currency codes supported by the application
 */
export const CURRENCY_CODES = ["EUR", "USD", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/**
 * Type guard for currency codes
 */
export const isCurrencyCode = (code: string): code is CurrencyCode => {
  return CURRENCY_CODES.includes(code as CurrencyCode);
};
