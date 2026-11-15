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

export const MAX_EXPENSE_DESCRIPTION_LENGTH = 512;

export interface ExpenseSplit {
  groupMemberId: number;
  amountInCents: number;
  percentage: number | null;
  shares?: number | null;
}

export interface SplitValidationResult {
  isValid: boolean;
  error?: { key: MessageKey; values?: Record<string, number> };
}

export type StrictValidationResult =
  { valid: true } | { valid: false; error: string; userMessage: MessageKey };

export interface DebtEntry {
  fromGroupMemberId: number;
  toGroupMemberId: number;
  amountInCents: number;
  currency: string;
}

export interface DebtSummary {
  currency: string;
  direct: DebtEntry[];
  simplified: DebtEntry[];
  /** @deprecated same as simplified; app builds up to v0.10 read this field */
  debts: DebtEntry[];
}

export type MemberBalances = Record<number, Record<string, number>>;

export interface GroupDebtSummary {
  currencies: Record<string, DebtSummary>;
  memberBalances: MemberBalances;
}

export const CURRENCY_CODES = ["EUR", "USD", "GBP", "CHF"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const isCurrencyCode = (code: string): code is CurrencyCode => {
  return CURRENCY_CODES.includes(code as CurrencyCode);
};
