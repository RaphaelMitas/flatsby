import type { MessageKey } from "@flatsby/i18n/message-key";
import type { ParseError } from "papaparse";
import Papa from "papaparse";
import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";
import { expenseCategories } from "@flatsby/i18n/messages/en/expenseCategories";

import type { ExpenseSubcategoryId } from "./categories";
import type { CurrencyCode } from "./types";
import { expenseSubcategories, expenseSubcategoryIdSchema } from "./categories";
import { decimalToCents } from "./conversion";
import { currencyCodeSchema, expenseSplitSchema } from "./schemas";
import { MAX_EXPENSE_DESCRIPTION_LENGTH } from "./types";

const splitwiseSubcategoryByCategory = new Map<string, ExpenseSubcategoryId>(
  Object.entries({
    // Food & Drinks
    groceries: "groceries",
    "food and drink": "other-food-drinks",
    "dining out": "restaurant",
    liquor: "bar",
    // Transport
    taxi: "taxi",
    parking: "parking",
    "gas/fuel": "gas",
    car: "other-transport",
    "bus/train": "public-transit",
    // Shopping
    clothing: "clothes",
    electronics: "electronics",
    "household supplies": "home-goods",
    // Entertainment
    movies: "movies",
    games: "games",
    sports: "sports",
    music: "music",
    "entertainment - other": "other-entertainment",
    // Housing
    rent: "rent",
    mortgage: "rent",
    maintenance: "maintenance",
    furniture: "furniture",
    "home - other": "other-housing",
    // Utilities
    electricity: "electric",
    "heat/gas": "other-utilities",
    water: "water",
    "tv/phone/internet": "internet",
    "utilities - other": "other-utilities",
    // Health
    insurance: "other-health",
    "medical expenses": "doctor",
    // Travel
    hotel: "hotel",
    plane: "flight",
    // Subscriptions
    services: "other-subscriptions",
    // Education
    education: "other-education",
    // Gifts
    gifts: "gift",
    // Pets
    pets: "other",
  }),
);

const subcategoryIdByLabel = new Map<string, ExpenseSubcategoryId>(
  expenseSubcategories.map((sub) => [
    expenseCategories.subcategories[sub.id].toLowerCase(),
    sub.id,
  ]),
);

function mapSplitwiseCategory(rawCategory: string): ExpenseSubcategoryId {
  const normalized = rawCategory.trim().toLowerCase();
  return (
    splitwiseSubcategoryByCategory.get(normalized) ??
    subcategoryIdByLabel.get(normalized) ??
    "other"
  );
}

interface SplitwiseRow {
  Date: string;
  Description: string;
  Category: string;
  Cost: string;
  Currency: string;
  [personName: string]: string;
}

export interface ImportMessage {
  key: MessageKey;
  values?: Record<string, string | number>;
}

export interface ParsedSplitwiseResult {
  rows: SplitwiseRow[];
  personNames: string[];
  errors: ImportMessage[];
}

export interface TransformConfig {
  targetCurrency: CurrencyCode;
  memberMapping: Record<string, number>;
}

export type TransformedExpense = BulkCreateExpensesInput["expenses"][number];

export interface SkippedRow {
  row: number;
  reason: ImportMessage;
}

export interface TransformResult {
  expenses: TransformedExpense[];
  skipped: SkippedRow[];
}

const papaErrorKeys = {
  MissingQuotes: msg("splitwiseImport.parseError.missingQuotes"),
  InvalidQuotes: msg("splitwiseImport.parseError.invalidQuotes"),
  UndetectableDelimiter: msg(
    "splitwiseImport.parseError.undetectableDelimiter",
  ),
  TooFewFields: msg("splitwiseImport.parseError.tooFewFields"),
  TooManyFields: msg("splitwiseImport.parseError.tooManyFields"),
} satisfies Record<ParseError["code"], MessageKey>;

export function parseSplitwiseCsv(csvText: string): ParsedSplitwiseResult {
  const errors: ImportMessage[] = [];

  const parsed = Papa.parse<SplitwiseRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push({
        key: papaErrorKeys[err.code],
        values: { row: err.row ?? 0 },
      });
    }
  }

  const headers = parsed.meta.fields ?? [];
  const currencyIndex = headers.indexOf("Currency");

  if (currencyIndex === -1) {
    return {
      rows: [],
      personNames: [],
      errors: [
        { key: msg("splitwiseImport.parseError.missingCurrencyColumn") },
      ],
    };
  }

  const personNames = headers.slice(currencyIndex + 1).filter(Boolean);

  if (personNames.length === 0) {
    return {
      rows: [],
      personNames: [],
      errors: [{ key: msg("splitwiseImport.parseError.noPersonColumns") }],
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
        reason: {
          key: msg("splitwiseImport.skipReason.currencyMismatch"),
          values: { actual: row.Currency, expected: config.targetCurrency },
        },
      });
      continue;
    }

    const cost = parseFloat(row.Cost);
    if (Number.isNaN(cost) || cost <= 0) {
      skipped.push({
        row: rowNum,
        reason: {
          key: msg("splitwiseImport.skipReason.invalidCost"),
          values: { cost: row.Cost },
        },
      });
      continue;
    }

    const personAmounts: { name: string; amount: number }[] = [];
    for (const name of Object.keys(config.memberMapping)) {
      const val = parseFloat(row[name] ?? "0");
      if (!Number.isNaN(val) && val !== 0) {
        personAmounts.push({ name, amount: val });
      }
    }

    const payers = personAmounts.filter((p) => p.amount > 0);
    const debtors = personAmounts.filter((p) => p.amount < 0);

    if (payers.length === 0) {
      skipped.push({
        row: rowNum,
        reason: { key: msg("splitwiseImport.skipReason.noPayer") },
      });
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

      expenses.push({
        paidByGroupMemberId: payerMemberId,
        amountInCents,
        currency: config.targetCurrency,
        description: row.Description,
        subcategory: mapSplitwiseCategory(row.Category),
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
        reason: { key: msg("splitwiseImport.skipReason.multiplePayers") },
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
        reason: {
          key: msg("splitwiseImport.skipReason.splitMismatch"),
          values: { diff },
        },
      });
      continue;
    }

    expenses.push({
      paidByGroupMemberId: payerMemberId,
      amountInCents: totalCents,
      currency: config.targetCurrency,
      description: row.Description || "",
      subcategory: mapSplitwiseCategory(row.Category),
      expenseDate: new Date(row.Date),
      splits,
      splitMethod: "custom",
    });
  }

  return { expenses, skipped };
}

const MAX_IMPORT_EXPENSES = 5000;
// Vercel rejects request bodies over 4.5MB before the API ever sees them.
const MAX_IMPORT_BYTES = 4_000_000;

export function exceedsImportLimit(expenses: TransformedExpense[]): boolean {
  return (
    expenses.length > MAX_IMPORT_EXPENSES ||
    new TextEncoder().encode(JSON.stringify(expenses)).length > MAX_IMPORT_BYTES
  );
}

export const bulkCreateExpensesSchema = z.object({
  groupId: z.number(),
  expenses: z
    .array(
      z.object({
        paidByGroupMemberId: z.number().min(1),
        amountInCents: z.number().int().min(1),
        currency: currencyCodeSchema,
        description: z.string().max(MAX_EXPENSE_DESCRIPTION_LENGTH).optional(),
        subcategory: expenseSubcategoryIdSchema.optional(),
        expenseDate: z.date(),
        splits: z.array(expenseSplitSchema).min(1),
        splitMethod: z.enum(["custom", "settlement"]),
      }),
    )
    .min(1)
    .max(MAX_IMPORT_EXPENSES),
});

export type BulkCreateExpensesInput = z.infer<typeof bulkCreateExpensesSchema>;
