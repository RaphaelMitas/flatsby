// ============================================================================
// Types for Expense Distribution and Validation
// ============================================================================
export const SPLIT_METHODS = [
  "equal",
  "percentage",
  "shares",
  "custom",
  "settlement",
] as const;

export type SplitMethod = (typeof SPLIT_METHODS)[number];

export const MAX_SHARES = 1000;

/** percentage is in basis points (100% = 10000) */
export interface ExpenseSplit {
  groupMemberId: number;
  amountInCents: number;
  percentage: number | null;
  shares?: number | null;
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
  { valid: true } | { valid: false; error: string; userMessage: string };

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
 * Debt summary for a single currency. `direct` is who owes whom per pair with
 * circular debts cancelled, `simplified` is the greedy settle plan.
 */
export interface DebtSummary {
  currency: string;
  direct: DebtEntry[];
  simplified: DebtEntry[];
}

/** groupMemberId -> currency -> balance in cents */
export type MemberBalances = Record<number, Record<string, number>>;

/**
 * Group debt summary across all currencies
 */
export interface GroupDebtSummary {
  currencies: Record<string, DebtSummary>;
  memberBalances: MemberBalances;
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

/** Which debt list a settlement was started from */
export type SettleSource = "direct" | "plan";
