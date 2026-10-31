import { z } from "zod/v4";

import type { CurrencyCode } from "./types";
import {
  addDays,
  calendarDateSchema,
  localDate,
  pickerDate,
} from "../calendar";
import { decimalToCents } from "./conversion";
import { CURRENCY_CODES, isCurrencyCode } from "./types";

export const RECEIPT_IMAGE_MAX_EDGE = 2048;
export const RECEIPT_IMAGE_QUALITY = 0.7;
const MAX_MERCHANT_LENGTH = 80;

export const scanReceiptInputSchema = z.object({
  // Vercel rejects bodies over 4.5 MB
  imageBase64: z.base64().max(3_000_000),
});

export const receiptReadingSchema = z.object({
  isReceipt: z
    .boolean()
    .describe(
      "False if the image is not a receipt, or too blurry to read the total",
    ),
  total: z
    .number()
    .nullable()
    .describe(
      "Final amount paid as printed (Summe, Gesamt, Total, Zu zahlen). Not a subtotal, tax line, tip suggestion, cash given (Gegeben, Bar) or change (Rückgeld). Null if not printed; never add up line items.",
    ),
  currency: z
    .string()
    .nullable()
    .describe(
      "ISO 4217 code of the currency the total is in, from the printed code, symbol, country or address (a $ in Canada is CAD). Null only if nothing on the receipt indicates a currency.",
    ),
  date: z
    .string()
    .nullable()
    .describe(
      "Purchase date as YYYY-MM-DD. European receipts print the day before the month. Null if absent.",
    ),
  merchant: z
    .string()
    .nullable()
    .describe(
      "Store or restaurant name as a short display name, e.g. REWE, without legal form or address. Null if absent.",
    ),
});

export type ReceiptReading = z.infer<typeof receiptReadingSchema>;

export const receiptScanSchema = z.object({
  amountInCents: z.number().int().positive().nullable(),
  currency: z.enum(CURRENCY_CODES).nullable(),
  expenseDay: calendarDateSchema.nullable(),
  description: z.string().max(MAX_MERCHANT_LENGTH).nullable(),
});

export type ReceiptScan = z.infer<typeof receiptScanSchema>;

// Models sometimes answer with the symbol despite being asked for the code
const CURRENCY_SYMBOLS: Record<string, string> = { "€": "EUR", "£": "GBP" };

export function receiptScanFrom(
  reading: ReceiptReading,
  today = localDate(),
): ReceiptScan {
  if (!reading.isReceipt) {
    return {
      amountInCents: null,
      currency: null,
      expenseDay: null,
      description: null,
    };
  }
  const amountInCents =
    reading.total === null ? 0 : decimalToCents(reading.total);
  const printed = reading.currency?.trim().toUpperCase() ?? null;
  const code = printed === null ? null : (CURRENCY_SYMBOLS[printed] ?? printed);
  const currency = code !== null && isCurrencyCode(code) ? code : null;
  // An amount in a currency the app can't book must not land in the form's currency
  const bookable = code === null || currency !== null;
  const day = calendarDateSchema.safeParse(reading.date);
  const description = reading.merchant?.trim().slice(0, MAX_MERCHANT_LENGTH);
  const amount =
    bookable && amountInCents > 0 && Number.isSafeInteger(amountInCents)
      ? amountInCents
      : null;
  return {
    amountInCents: amount,
    // Alone it would switch the currency of whatever amount the person typed
    currency: amount === null ? null : currency,
    // The server's UTC day can be one behind the person's own
    expenseDay: day.success && day.data <= addDays(today, 1) ? day.data : null,
    description: description || null,
  };
}

// A currency alone fills nothing the person would check
export const isEmptyReceiptScan = (scan: ReceiptScan) =>
  scan.amountInCents === null &&
  scan.expenseDay === null &&
  scan.description === null;

export const receiptFieldSchema = z.enum([
  "amountInCents",
  "currency",
  "expenseDate",
  "description",
]);

export interface ReceiptFormValues {
  amountInCents: number;
  currency: CurrencyCode;
  expenseDate: Date;
  description: string;
}

export type Filled = Partial<ReceiptFormValues>;

export const filledBy = (scan: ReceiptScan): Filled => ({
  ...(scan.amountInCents !== null && { amountInCents: scan.amountInCents }),
  ...(scan.currency !== null && { currency: scan.currency }),
  ...(scan.expenseDay !== null && { expenseDate: pickerDate(scan.expenseDay) }),
  ...(scan.description !== null && { description: scan.description }),
});

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date
    ? localDate(a) === localDate(b)
    : a === b;

export function receiptReport(filled: Filled, values: ReceiptFormValues) {
  const scanned = receiptFieldSchema.options.filter(
    (field) => filled[field] !== undefined,
  );
  return {
    filled: scanned,
    edited: scanned.filter((field) => !sameValue(filled[field], values[field])),
  };
}

export type StagePhase =
  "closed" | "reading" | "revealing" | "preview" | "failing";
export type StageTag = "store" | "amount" | "date";
export interface StageEvent {
  at: number;
  phase?: StagePhase;
  reveal?: StageTag;
}

// A fast answer still gets one look over the receipt, so the stage never flashes
export const MIN_READING_MS = 1200;
const REVEAL_GAP_MS = 550;
const PREVIEW_AFTER_MS = 600;
const FAILING_MS = 1800;

export function stageTimeline({
  scan,
  readingFor,
  reduced,
}: {
  scan: ReceiptScan | null;
  readingFor: number;
  reduced: boolean;
}): StageEvent[] {
  const start = reduced ? 0 : Math.max(0, MIN_READING_MS - readingFor);
  if (!scan) {
    return [
      { at: start, phase: "failing" },
      { at: start + (reduced ? 300 : FAILING_MS), phase: "closed" },
    ];
  }
  const tags: StageTag[] = [];
  if (scan.description !== null) tags.push("store");
  if (scan.amountInCents !== null) tags.push("amount");
  if (scan.expenseDay !== null) tags.push("date");
  const gap = reduced ? 0 : REVEAL_GAP_MS;
  return [
    { at: start, phase: "revealing" },
    ...tags.map((reveal, i) => ({ at: start + gap * (i + 1), reveal })),
    {
      at: start + gap * tags.length + (reduced ? 150 : PREVIEW_AFTER_MS),
      phase: "preview",
    },
  ];
}

export const receiptTextLineSchema = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type ReceiptTextLine = z.infer<typeof receiptTextLineSchema>;
export type ReceiptBox = Omit<ReceiptTextLine, "text">;

const TOTAL_WORDS = /summe|total|gesamt|zu zahlen|betrag|amount|due/i;
const squash = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Finds where on the photo each value the model read is printed
export function receiptMarks(
  lines: ReceiptTextLine[],
  scan: ReceiptScan,
): Partial<Record<StageTag, ReceiptBox>> {
  const ordered = [...lines].sort((a, b) => a.y - b.y);
  const onRowWith = (line: ReceiptTextLine, words: RegExp) =>
    ordered.some(
      (other) =>
        words.test(other.text) &&
        Math.abs(other.y + other.height / 2 - (line.y + line.height / 2)) <
          line.height,
    );
  const box = (line?: ReceiptTextLine) =>
    line && {
      x: line.x,
      y: line.y,
      width: line.width,
      height: line.height,
    };

  const store = scan.description && squash(scan.description);
  const marks: Partial<Record<StageTag, ReceiptBox>> = {};
  if (store && store.length > 1) {
    marks.store = box(
      ordered.find((line) => squash(line.text).includes(store)),
    );
  }
  if (scan.amountInCents !== null) {
    const whole = Math.floor(scan.amountInCents / 100);
    const cents = String(scan.amountInCents % 100).padStart(2, "0");
    const amount = new RegExp(`(^|\\D)${whole}[.,]${cents}(\\D|$)`);
    const hits = ordered.filter((line) => amount.test(line.text));
    marks.amount = box(
      hits.find((line) => onRowWith(line, TOTAL_WORDS)) ?? hits[0],
    );
  }
  if (scan.expenseDay !== null) {
    const [year = "", month = "", day = ""] = scan.expenseDay.split("-");
    const d = String(Number(day));
    const m = String(Number(month));
    const date = new RegExp(
      `(^|\\D)0?${d}[./-]0?${m}[./-](${year}|${year.slice(2)})(\\D|$)|${scan.expenseDay}`,
    );
    marks.date = box(ordered.find((line) => date.test(line.text)));
  }
  return marks;
}
