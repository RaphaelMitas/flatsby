import { z } from "zod/v4";

import { addDays, calendarDateSchema } from "../calendar";
import { decimalToCents } from "./conversion";
import { CURRENCY_CODES, isCurrencyCode } from "./types";

export const RECEIPT_IMAGE_MAX_EDGE = 2048;
export const RECEIPT_IMAGE_QUALITY = 0.7;
const MAX_MERCHANT_LENGTH = 80;

export const scanReceiptInputSchema = z.object({
  // A JPEG at RECEIPT_IMAGE_MAX_EDGE stays far below this, and Vercel rejects bodies over 4.5 MB
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
      "ISO 4217 code, only when the receipt prints a code or an unambiguous symbol (€, £, CHF). Null for a bare $ or when absent.",
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

const utcToday = () => new Date().toISOString().slice(0, 10);

export function receiptScanFrom(
  reading: ReceiptReading,
  today = utcToday(),
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
  const currency = reading.currency?.trim().toUpperCase() ?? "";
  const day = calendarDateSchema.safeParse(reading.date);
  const description = reading.merchant?.trim().slice(0, MAX_MERCHANT_LENGTH);
  return {
    amountInCents: amountInCents > 0 ? amountInCents : null,
    currency: isCurrencyCode(currency) ? currency : null,
    // The server's UTC day can be one behind the person's own
    expenseDay: day.success && day.data <= addDays(today, 1) ? day.data : null,
    description: description || null,
  };
}

export const isEmptyReceiptScan = (scan: ReceiptScan) =>
  Object.values(scan).every((value) => value === null);

export const receiptFieldSchema = z.enum([
  "amountInCents",
  "currency",
  "expenseDate",
  "description",
]);

export type ReceiptField = z.infer<typeof receiptFieldSchema>;
