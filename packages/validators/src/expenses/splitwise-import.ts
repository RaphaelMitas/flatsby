import Papa from "papaparse";
import { z } from "zod/v4";

import type { ExpenseCategoryGroup, ExpenseSubcategoryId } from "./categories";
import type { CurrencyCode } from "./types";
import {
  expenseCategoryGroupSchema,
  expenseSubcategories,
  expenseSubcategoryIdSchema,
} from "./categories";
import { decimalToCents } from "./conversion";
import { currencyCodeSchema, expenseSplitSchema } from "./schemas";

/**
 * Maps Splitwise category strings to our subcategory IDs.
 * Case-insensitive lookup. Unmatched categories fall back to "other".
 */
const SPLITWISE_CATEGORY_MAP: Record<
  string,
  { group: ExpenseCategoryGroup; subcategory: ExpenseSubcategoryId }
> = {
  // Food & Drinks
  groceries: { group: "food-drinks", subcategory: "groceries" },
  "food and drink": { group: "food-drinks", subcategory: "other-food-drinks" },
  "dining out": { group: "food-drinks", subcategory: "restaurant" },
  liquor: { group: "food-drinks", subcategory: "bar" },
  // Transport
  taxi: { group: "transport", subcategory: "taxi" },
  parking: { group: "transport", subcategory: "parking" },
  "gas/fuel": { group: "transport", subcategory: "gas" },
  car: { group: "transport", subcategory: "other-transport" },
  "bus/train": { group: "transport", subcategory: "public-transit" },
  // Shopping
  clothing: { group: "shopping", subcategory: "clothes" },
  electronics: { group: "shopping", subcategory: "electronics" },
  "household supplies": { group: "shopping", subcategory: "home-goods" },
  // Entertainment
  movies: { group: "entertainment", subcategory: "movies" },
  games: { group: "entertainment", subcategory: "games" },
  sports: { group: "entertainment", subcategory: "sports" },
  music: { group: "entertainment", subcategory: "music" },
  "entertainment - other": {
    group: "entertainment",
    subcategory: "other-entertainment",
  },
  // Housing
  rent: { group: "housing", subcategory: "rent" },
  mortgage: { group: "housing", subcategory: "rent" },
  maintenance: { group: "housing", subcategory: "maintenance" },
  furniture: { group: "housing", subcategory: "furniture" },
  "home - other": { group: "housing", subcategory: "other-housing" },
  // Utilities
  electricity: { group: "utilities", subcategory: "electric" },
  "heat/gas": { group: "utilities", subcategory: "other-utilities" },
  water: { group: "utilities", subcategory: "water" },
  "tv/phone/internet": { group: "utilities", subcategory: "internet" },
  "utilities - other": { group: "utilities", subcategory: "other-utilities" },
  // Health
  insurance: { group: "health", subcategory: "other-health" },
  "medical expenses": { group: "health", subcategory: "doctor" },
  // Travel
  hotel: { group: "travel", subcategory: "hotel" },
  plane: { group: "travel", subcategory: "flight" },
  // Subscriptions
  services: { group: "subscriptions", subcategory: "other-subscriptions" },
  // Education
  education: { group: "education", subcategory: "other-education" },
  // Gifts
  gifts: { group: "gifts", subcategory: "gift" },
  // Pets (map to other)
  pets: { group: "other", subcategory: "other" },
};

// Also build a reverse lookup from subcategory labels for fuzzy matching
const subcategoryLabelMap = new Map<
  string,
  { group: ExpenseCategoryGroup; subcategory: ExpenseSubcategoryId }
>();
for (const sub of expenseSubcategories) {
  subcategoryLabelMap.set(sub.label.toLowerCase(), {
    group: sub.group,
    subcategory: sub.id,
  });
}

function mapSplitwiseCategory(rawCategory: string): {
  category: ExpenseCategoryGroup;
  subcategory: ExpenseSubcategoryId;
} {
  const normalized = rawCategory.trim().toLowerCase();

  // Direct match in the Splitwise map
  const directMatch = SPLITWISE_CATEGORY_MAP[normalized];
  if (directMatch) {
    return {
      category: directMatch.group,
      subcategory: directMatch.subcategory,
    };
  }

  // Try matching against subcategory labels
  const labelMatch = subcategoryLabelMap.get(normalized);
  if (labelMatch) {
    return { category: labelMatch.group, subcategory: labelMatch.subcategory };
  }

  // Fallback
  return { category: "other", subcategory: "other" };
}

interface SplitwiseRow {
  Date: string;
  Description: string;
  Category: string;
  Cost: string;
  Currency: string;
  [personName: string]: string;
}

export interface ParsedSplitwiseResult {
  rows: SplitwiseRow[];
  personNames: string[];
  errors: string[];
}

export interface TransformConfig {
  targetCurrency: CurrencyCode;
  memberMapping: Record<string, number>;
}

export interface TransformedExpense {
  paidByGroupMemberId: number;
  amountInCents: number;
  currency: CurrencyCode;
  description?: string;
  category?: ExpenseCategoryGroup;
  subcategory?: ExpenseSubcategoryId;
  expenseDate: Date;
  splits: z.infer<typeof expenseSplitSchema>[];
  splitMethod: "custom" | "settlement";
}

export interface SkippedRow {
  row: number;
  reason: string;
}

export interface TransformResult {
  expenses: TransformedExpense[];
  skipped: SkippedRow[];
}

export function parseSplitwiseCsv(csvText: string): ParsedSplitwiseResult {
  const errors: string[] = [];

  const parsed = Papa.parse<SplitwiseRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push(`Row ${err.row}: ${err.message}`);
    }
  }

  const headers = parsed.meta.fields ?? [];
  const currencyIndex = headers.indexOf("Currency");

  if (currencyIndex === -1) {
    return { rows: [], personNames: [], errors: ["Missing 'Currency' column"] };
  }

  const personNames = headers.slice(currencyIndex + 1).filter(Boolean);

  if (personNames.length === 0) {
    return {
      rows: [],
      personNames: [],
      errors: ["No person columns found after 'Currency'"],
    };
  }

  const rows = parsed.data.filter((row) => {
    if (!row.Date.trim()) return false;
    if (row.Description.toLowerCase().includes("total balance")) return false;
    return true;
  });

  return { rows, personNames, errors };
}

function parseSplitwiseDate(dateStr: string): Date {
  // Splitwise exports dates as YYYY-MM-DD. new Date("YYYY-MM-DD") parses as
  // UTC midnight, which shifts to the previous day in negative-offset timezones.
  // Appending T12:00:00 keeps the date stable regardless of timezone.
  return new Date(`${dateStr}T12:00:00`);
}

function getMemberId(
  mapping: Record<string, number>,
  name: string,
): number | undefined {
  return mapping[name];
}

export function transformSplitwiseRows(
  rows: SplitwiseRow[],
  config: TransformConfig,
): TransformResult {
  const expenses: TransformedExpense[] = [];
  const skipped: SkippedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const rowNum = i + 2; // +2 for header row and 0-index

    if (row.Currency !== config.targetCurrency) {
      skipped.push({
        row: rowNum,
        reason: `Currency mismatch: ${row.Currency} (expected ${config.targetCurrency})`,
      });
      continue;
    }

    const cost = parseFloat(row.Cost);
    if (isNaN(cost) || cost <= 0) {
      skipped.push({ row: rowNum, reason: `Invalid cost: ${row.Cost}` });
      continue;
    }

    const personAmounts: { name: string; amount: number }[] = [];
    for (const name of Object.keys(config.memberMapping)) {
      const val = parseFloat(row[name] ?? "0");
      if (!isNaN(val) && val !== 0) {
        personAmounts.push({ name, amount: val });
      }
    }

    const payers = personAmounts.filter((p) => p.amount > 0);
    const debtors = personAmounts.filter((p) => p.amount < 0);

    if (payers.length === 0) {
      skipped.push({ row: rowNum, reason: "No payer found" });
      continue;
    }

    const firstPayer = payers[0];
    const firstDebtor = debtors[0];

    const isSettlement =
      payers.length === 1 &&
      debtors.length === 1 &&
      firstPayer &&
      firstDebtor &&
      row.Category === "Payment";

    if (isSettlement) {
      const payerMemberId = getMemberId(config.memberMapping, firstPayer.name);
      const receiverMemberId = getMemberId(
        config.memberMapping,
        firstDebtor.name,
      );
      if (!payerMemberId || !receiverMemberId) continue;

      const amountInCents = decimalToCents(firstPayer.amount);

      const settlementMapping = mapSplitwiseCategory(row.Category);
      expenses.push({
        paidByGroupMemberId: payerMemberId,
        amountInCents,
        currency: config.targetCurrency,
        description: row.Description,
        category: settlementMapping.category,
        subcategory: settlementMapping.subcategory,
        expenseDate: parseSplitwiseDate(row.Date),
        splits: [
          {
            groupMemberId: receiverMemberId,
            amountInCents,
            percentage: null,
          },
        ],
        splitMethod: "settlement",
      });
      continue;
    }

    if (payers.length > 1) {
      skipped.push({
        row: rowNum,
        reason: "Multiple payers not supported",
      });
      continue;
    }

    const payer = firstPayer;
    if (!payer) continue;

    const payerMemberId = getMemberId(config.memberMapping, payer.name);
    if (!payerMemberId) continue;

    const totalCents = decimalToCents(cost);

    const rawSplits: {
      groupMemberId: number;
      amountInCents: number;
      percentage: null;
    }[] = [];

    for (const d of debtors) {
      const memberId = getMemberId(config.memberMapping, d.name);
      if (!memberId) continue;
      rawSplits.push({
        groupMemberId: memberId,
        amountInCents: decimalToCents(Math.abs(d.amount)),
        percentage: null,
      });
    }

    // The payer's share = totalCost - sum(others' shares)
    const othersTotal = rawSplits.reduce((s, r) => s + r.amountInCents, 0);
    const payerShare = totalCents - othersTotal;

    const splits = [...rawSplits];
    if (payerShare > 0) {
      splits.push({
        groupMemberId: payerMemberId,
        amountInCents: payerShare,
        percentage: null,
      });
    }

    // Fix 1-cent rounding discrepancies
    const splitsTotal = splits.reduce((s, r) => s + r.amountInCents, 0);
    const diff = totalCents - splitsTotal;
    const firstSplit = splits[0];
    if (Math.abs(diff) === 1 && firstSplit) {
      firstSplit.amountInCents += diff;
    } else if (Math.abs(diff) > 1) {
      skipped.push({
        row: rowNum,
        reason: `Split amounts don't match total (off by ${diff} cents)`,
      });
      continue;
    }

    const mapping = mapSplitwiseCategory(row.Category);
    expenses.push({
      paidByGroupMemberId: payerMemberId,
      amountInCents: totalCents,
      currency: config.targetCurrency,
      description: row.Description || "",
      category: mapping.category,
      subcategory: mapping.subcategory,
      expenseDate: new Date(row.Date),
      splits,
      splitMethod: "custom",
    });
  }

  return { expenses, skipped };
}

export const bulkCreateExpensesSchema = z.object({
  groupId: z.number(),
  expenses: z
    .array(
      z.object({
        paidByGroupMemberId: z.number().min(1),
        amountInCents: z.number().int().min(1),
        currency: currencyCodeSchema,
        description: z.string().max(512).optional(),
        category: expenseCategoryGroupSchema.optional(),
        subcategory: expenseSubcategoryIdSchema.optional(),
        expenseDate: z.date(),
        splits: z.array(expenseSplitSchema).min(1),
        splitMethod: z.enum(["custom", "settlement"]),
      }),
    )
    .min(1)
    .max(500),
});

export type BulkCreateExpensesInput = z.infer<typeof bulkCreateExpensesSchema>;
