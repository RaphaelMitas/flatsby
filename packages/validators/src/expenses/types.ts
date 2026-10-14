// ============================================================================
// Types for Expense Distribution and Validation
// ============================================================================
import type { MessageKey } from "@flatsby/i18n/message-key";

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
  error?: { key: MessageKey; values?: Record<string, number> };
}

/**
 * Strict validation result with user-friendly message
 */
export type StrictValidationResult =
  { valid: true } | { valid: false; error: string; userMessage: MessageKey };

/**
 * Debt entry between two members
 */
export interface DebtEntry {
  fromGroupMemberId: number;
  toGroupMemberId: number;
  amountInCents: number;
  currency: string;
}

/** direct: each pair's net from their shared expenses; simplified: the greedy settle plan */
export interface DebtSummary {
  currency: string;
  direct: DebtEntry[];
  simplified: DebtEntry[];
  /** @deprecated same as simplified; app builds up to v0.10 read this field */
  debts: DebtEntry[];
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
export const CURRENCY_CODES = ["EUR", "USD", "GBP", "CHF"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/**
 * Type guard for currency codes
 */
export const isCurrencyCode = (code: string): code is CurrencyCode => {
  return CURRENCY_CODES.includes(code as CurrencyCode);
};
