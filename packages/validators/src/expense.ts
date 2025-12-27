import { z } from "zod/v4";

// ============================================================================
// Types
// ============================================================================

export interface DebtEntry {
  fromGroupMemberId: number;
  toGroupMemberId: number;
  amountInCents: number;
  currency: string;
}

export interface DebtSummary {
  debts: DebtEntry[];
  currency: string;
}

export interface GroupDebtSummary {
  currencies: Record<string, DebtSummary>;
  memberBalances: Record<number, Record<string, number>>; // groupMemberId -> currency -> balance in cents
}

export interface SplitValidationResult {
  isValid: boolean;
  error?: string;
}

// SplitData is now ExpenseSplit from the shared schema

// ============================================================================
// Currency Codes
// ============================================================================

export const CURRENCY_CODES = ["EUR", "USD", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const isCurrencyCode = (code: string): code is CurrencyCode => {
  return CURRENCY_CODES.includes(code as CurrencyCode);
};

// ============================================================================
// Conversion Utilities
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

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format currency amount with currency symbol
 * @param amountDecimal - Amount in decimal (not cents)
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @returns Formatted string (e.g., "$10.50" or "€10.50")
 */
export function formatCurrency(
  amountDecimal: number,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountDecimal);
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

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate expense splits based on split method
 * @param splits - Array of split objects with groupMemberId and amounts in cents
 * @param totalAmountCents - Total expense amount in cents
 * @param method - Split method: "equal", "percentage", or "custom"
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSplits(
  splits: {
    groupMemberId: number;
    amountInCents?: number;
    percentage: number | null;
  }[],
  totalAmountCents: number,
  method: "equal" | "percentage" | "custom",
): SplitValidationResult {
  if (splits.length === 0) {
    return { isValid: false, error: "At least one person must be included" };
  }

  if (method === "equal") {
    // Equal splits are always valid if there are members
    return { isValid: true };
  }

  if (method === "percentage") {
    // Percentages are stored in basis points (100% = 10000)
    const totalBasisPoints = splits.reduce(
      (sum, split) => sum + (split.percentage ?? 0),
      0,
    );
    if (Math.abs(totalBasisPoints - 10000) > 1) {
      const percentDisplay = (totalBasisPoints / 100).toFixed(2);
      return {
        isValid: false,
        error: `Percentages must sum to 100% (currently ${percentDisplay}%)`,
      };
    }
    return { isValid: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (method === "custom") {
    const totalSplitCents = splits.reduce(
      (sum, split) => sum + (split.amountInCents ?? 0),
      0,
    );
    // Allow for rounding tolerance of 1 cent
    if (Math.abs(totalSplitCents - totalAmountCents) > 1) {
      return {
        isValid: false,
        error: `Split amounts must sum to ${formatCurrencyFromCents(totalAmountCents, "USD")} (currently ${formatCurrencyFromCents(totalSplitCents, "USD")})`,
      };
    }
    return { isValid: true };
  }

  return { isValid: false, error: "Invalid split method" };
}

/**
 * Strict validation for expense splits (server-side)
 * Returns an error message if invalid, or null if valid
 */
export function validateExpenseSplitsStrict(
  expenseAmountInCents: number,
  splits: { amountInCents: number }[],
  isSettlement: boolean,
): { valid: true } | { valid: false; error: string; userMessage: string } {
  if (isSettlement) {
    if (splits.length !== 1) {
      return {
        valid: false,
        error: "settlement splits must be exactly 1",
        userMessage: "Settlement must have exactly one recipient",
      };
    }
  }

  const totalSplitAmount = splits.reduce(
    (sum, split) => sum + split.amountInCents,
    0,
  );

  if (totalSplitAmount !== expenseAmountInCents) {
    return {
      valid: false,
      error: `split amounts (${totalSplitAmount} cents) must sum to expense amount (${expenseAmountInCents} cents)`,
      userMessage: "The split amounts don't match the total expense amount",
    };
  }

  return { valid: true };
}

// ============================================================================
// Calculation Utilities
// ============================================================================

/**
 * Convert percentage in basis points to amount in cents
 * @param totalAmountCents - Total amount in cents
 * @param percentageBasisPoints - Percentage in basis points (100% = 10000)
 * @returns Amount in cents
 */
export function percentageToAmountCents(
  totalAmountCents: number,
  percentageBasisPoints: number,
): number {
  return Math.round((percentageBasisPoints / 10000) * totalAmountCents);
}

/**
 * Calculate even percentage distribution for a number of members
 * Returns percentages in basis points (100% = 10000) with remainder distributed round-robin
 * @param memberCount - Number of members to split between
 * @returns Array of basis points for each member (sums to 10000)
 */
export function calculateEvenPercentageBasisPoints(
  memberCount: number,
): number[] {
  if (memberCount <= 0) return [];

  const basePercentage = Math.floor(10000 / memberCount);
  let remainingBasisPoints = 10000 - basePercentage * memberCount;

  const percentages: number[] = [];
  for (let i = 0; i < memberCount; i++) {
    // Distribute remainder round-robin
    const extra = remainingBasisPoints > 0 ? 1 : 0;
    percentages.push(basePercentage + extra);
    if (remainingBasisPoints > 0) remainingBasisPoints--;
  }

  return percentages;
}

/**
 * Calculate even split amounts for given member IDs
 * @param memberIds - Array of member IDs to split between
 * @param totalAmountCents - Total amount in cents
 * @returns Array of ExpenseSplit with amounts and percentages
 */
export function calculateEvenSplitAmounts(
  memberIds: number[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const percentages = calculateEvenPercentageBasisPoints(memberIds.length);

  return memberIds.map((groupMemberId, index) => ({
    groupMemberId,
    amountInCents: percentageToAmountCents(
      totalAmountCents,
      percentages[index] ?? 0,
    ),
    percentage: percentages[index] ?? null,
  }));
}

// ============================================================================
// Debt Calculation Utilities
// ============================================================================

/**
 * Calculate debts from expenses and splits
 * Returns a summary with currency-grouped debts and member balances
 */
export function calculateDebts(
  expenses: {
    paidByGroupMemberId: number;
    amountInCents: number;
    currency: string;
    expenseSplits: {
      groupMemberId: number;
      amountInCents: number;
    }[];
  }[],
): GroupDebtSummary {
  const memberBalances: Record<number, Record<string, number>> = {};
  const currencies = new Set<string>();

  // Initialize balances for all members and currencies
  for (const expense of expenses) {
    currencies.add(expense.currency);
    const payerBalances = (memberBalances[expense.paidByGroupMemberId] ??= {});
    payerBalances[expense.currency] ??= 0;

    for (const split of expense.expenseSplits) {
      const splitterBalances = (memberBalances[split.groupMemberId] ??= {});
      splitterBalances[expense.currency] ??= 0;
    }
  }

  // Calculate net balances
  for (const expense of expenses) {
    const { paidByGroupMemberId, amountInCents, currency } = expense;
    const payerBalances = memberBalances[paidByGroupMemberId];
    if (payerBalances) {
      // Payer gets credited (positive balance)
      const currentBalance = payerBalances[currency];
      if (currentBalance !== undefined) {
        payerBalances[currency] = currentBalance + amountInCents;
      } else {
        payerBalances[currency] = amountInCents;
      }
    }

    // Splitters get debited (negative balance)
    for (const split of expense.expenseSplits) {
      const splitterBalances = memberBalances[split.groupMemberId];
      if (splitterBalances) {
        const currentBalance = splitterBalances[currency];
        if (currentBalance !== undefined) {
          splitterBalances[currency] = currentBalance - split.amountInCents;
        } else {
          splitterBalances[currency] = -split.amountInCents;
        }
      }
    }
  }

  // Simplify debts for each currency
  const currencyDebts: Record<string, DebtSummary> = {};
  for (const currency of currencies) {
    const debts = simplifyDebts(memberBalances, currency);
    currencyDebts[currency] = {
      debts,
      currency,
    };
  }

  return {
    currencies: currencyDebts,
    memberBalances,
  };
}

/**
 * Simplify debts using a greedy algorithm to minimize transactions
 */
export function simplifyDebts(
  memberBalances: Record<number, Record<string, number>>,
  currency: string,
): DebtEntry[] {
  // Get all members with non-zero balances for this currency
  const balances: { memberId: number; balance: number }[] = [];
  for (const [memberId, currencies] of Object.entries(memberBalances)) {
    const balance = currencies[currency] ?? 0;
    if (balance !== 0) {
      balances.push({ memberId: Number(memberId), balance });
    }
  }

  // Separate creditors (positive) and debtors (negative)
  const creditors = balances
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < 0)
    .sort((a, b) => a.balance - b.balance);

  const debts: DebtEntry[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    if (!creditor || !debtor) break;

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

    debts.push({
      fromGroupMemberId: debtor.memberId,
      toGroupMemberId: creditor.memberId,
      amountInCents: amount,
      currency,
    });

    creditor.balance -= amount;
    debtor.balance += amount;

    if (creditor.balance === 0) {
      creditorIndex++;
    }
    if (debtor.balance === 0) {
      debtorIndex++;
    }
  }

  return debts;
}

// ============================================================================
// Zod Schemas - Shared between API and Client
// ============================================================================

/**
 * Shared split schema - used by both client forms and API
 * percentage is in basis points (0-10000 = 0-100%)
 */
export const expenseSplitSchema = z.object({
  groupMemberId: z.number(),
  amountInCents: z.number().int(),
  percentage: z.number().int().min(0).max(10000).nullable(),
});

export type ExpenseSplit = z.infer<typeof expenseSplitSchema>;

/**
 * Shared expense base fields - common between create and update
 */
const expenseBaseFields = {
  paidByGroupMemberId: z.number().min(1, "Please select who paid"),
  amountInCents: z.number().int().min(1, "Amount must be greater than 0"),
  currency: z.enum(CURRENCY_CODES),
  description: z.string().max(512).optional(),
  category: z.string().max(100).optional(),
  expenseDate: z.date(),
  splits: z
    .array(expenseSplitSchema)
    .min(1, "At least one person must be included"),
};

/**
 * Schema for creating a new expense - used by both client and API
 */
export const createExpenseSchema = z.object({
  ...expenseBaseFields,
  groupId: z.number(),
  isSettlement: z.boolean(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/**
 * Schema for updating an expense - used by both client and API
 */
export const updateExpenseSchema = z.object({
  expenseId: z.number(),
  paidByGroupMemberId: z.number().optional(),
  amountInCents: z.number().int().min(1).optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
  description: z.string().max(512).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  expenseDate: z.date().optional(),
  splits: z.array(expenseSplitSchema).min(1).optional(),
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// ============================================================================
// Form Schemas - Client-side with additional UI fields
// ============================================================================

/**
 * Schema for expense form - extends base with splitMethod for UI
 */
export const expenseFormSchema = z
  .object({
    ...expenseBaseFields,
    splitMethod: z.enum(["equal", "percentage", "custom"]),
  })
  .refine(
    (data) => {
      const validation = validateSplits(
        data.splits,
        data.amountInCents,
        data.splitMethod,
      );
      return validation.isValid;
    },
    {
      message: "Split amounts are invalid",
      path: ["splits"],
    },
  );

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/**
 * Schema for settlement form
 */
export const settlementFormSchema = z.object({
  amountInCents: z.number().min(1, "Amount must be greater than 0"),
});

export type SettlementFormValues = z.infer<typeof settlementFormSchema>;
