import { useRef, useState } from "react";

import type { ReceiptScan } from "./receipt-scan";
import type { CurrencyCode } from "./types";
import { formatCurrencyFromCents, formatExpenseDateShort } from "./formatting";
import { isEmptyReceiptScan, receiptFieldSchema } from "./receipt-scan";

type ScanResult =
  | { success: true; data: ReceiptScan }
  | { success: false; error: { message: string } };

export type ReceiptScanState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "found"; scan: ReceiptScan }
  // Without a message the receipt was read but nothing on it was usable
  | { status: "failed"; message?: string };

interface ReceiptValues {
  amountInCents?: number;
  currency?: CurrencyCode;
  expenseDate?: Date;
  description?: string;
}

type FormValues = Required<ReceiptValues>;

interface SetOptions {
  shouldDirty: boolean;
  shouldValidate: boolean;
}

// Matches react-hook-form's setValue for the four fields a receipt fills
interface SetReceiptValue {
  (name: "amountInCents", value: number, options: SetOptions): void;
  (name: "currency", value: CurrencyCode, options: SetOptions): void;
  (name: "expenseDate", value: Date, options: SetOptions): void;
  (name: "description", value: string, options: SetOptions): void;
}

const valuesOf = (scan: ReceiptScan): ReceiptValues => ({
  amountInCents: scan.amountInCents ?? undefined,
  currency: scan.currency ?? undefined,
  // A day without a time reads as local midnight, so the picker shows the printed day
  expenseDate: scan.expenseDay
    ? new Date(`${scan.expenseDay}T00:00:00`)
    : undefined,
  description: scan.description ?? undefined,
});

// An amount without a printed currency is read in the form's
export function receiptPreview(
  scan: ReceiptScan,
  currency: CurrencyCode,
  locale: Intl.LocalesArgument,
) {
  const { amountInCents, expenseDate, description } = valuesOf(scan);
  return {
    store: description ?? null,
    amount:
      amountInCents === undefined
        ? null
        : formatCurrencyFromCents({
            cents: amountInCents,
            currency: scan.currency ?? currency,
            locale,
          }),
    date: expenseDate ? formatExpenseDateShort(expenseDate, locale) : null,
  };
}

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date
    ? a.toDateString() === b.toDateString()
    : a === b;

export function useReceiptScan({
  read,
  setValue,
  errorMessage,
}: {
  read: (imageBase64: string) => Promise<ScanResult>;
  setValue: SetReceiptValue;
  errorMessage: string;
}) {
  const [state, setState] = useState<ReceiptScanState>({ status: "idle" });
  const [applied, setApplied] = useState<ReceiptValues>();
  // Outlives the found state so the preview keeps its rows while it animates closed
  const [lastScan, setLastScan] = useState<ReceiptScan>();
  const attempt = useRef(0);

  const scan = async (imageBase64: string) => {
    const current = ++attempt.current;
    setState({ status: "reading" });
    const result = await read(imageBase64).catch(() => null);
    if (current !== attempt.current) return;
    if (!result) setState({ status: "failed", message: errorMessage });
    else if (!result.success)
      setState({ status: "failed", message: result.error.message });
    else if (isEmptyReceiptScan(result.data)) setState({ status: "failed" });
    else {
      setLastScan(result.data);
      setState({ status: "found", scan: result.data });
    }
  };

  const reset = () => {
    attempt.current++;
    setState({ status: "idle" });
  };

  const apply = () => {
    if (state.status !== "found") return;
    const values = valuesOf(state.scan);
    const options = { shouldDirty: true, shouldValidate: true };
    if (values.description !== undefined)
      setValue("description", values.description, options);
    if (values.currency !== undefined)
      setValue("currency", values.currency, options);
    if (values.amountInCents !== undefined)
      setValue("amountInCents", values.amountInCents, options);
    if (values.expenseDate !== undefined)
      setValue("expenseDate", values.expenseDate, options);
    setApplied(values);
    setState({ status: "idle" });
  };

  // Tells us how often people correct what the scan filled in
  const report = (values: FormValues) => {
    if (!applied) return undefined;
    const edited = receiptFieldSchema.options.filter(
      (field) =>
        applied[field] !== undefined &&
        !sameValue(applied[field], values[field]),
    );
    return { edited };
  };

  return {
    state,
    lastScan,
    scan,
    fail: (message: string) => setState({ status: "failed", message }),
    reset,
    apply,
    report,
  };
}
