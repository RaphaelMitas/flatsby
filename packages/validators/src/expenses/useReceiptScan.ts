import { useRef, useState } from "react";

import type { Filled, ReceiptFormValues, ReceiptScan } from "./receipt-scan";
import type { CurrencyCode } from "./types";
import { pickerDate } from "../calendar";
import { formatCurrencyFromCents, formatExpenseDateShort } from "./formatting";
import { filledBy, isEmptyReceiptScan, receiptReport } from "./receipt-scan";

type ScanResult =
  | { success: true; data: ReceiptScan }
  | { success: false; error: { message: string } };

export type ReceiptScanState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "found" }
  // Without a message the receipt was read but nothing on it was usable
  | { status: "failed"; message?: string };

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

export function useReceiptScan({
  read,
  setValue,
  currency,
  locale,
  messages,
}: {
  read: (imageBase64: string) => Promise<ScanResult>;
  setValue: SetReceiptValue;
  currency: CurrencyCode;
  locale: Intl.LocalesArgument;
  messages: { error: string; unsupportedImage: string };
}) {
  const [state, setState] = useState<ReceiptScanState>({ status: "idle" });
  const [applied, setApplied] = useState<Filled>();
  // Outlives the found state so the preview keeps its rows while it animates closed
  const [lastScan, setLastScan] = useState<ReceiptScan>();
  const attempt = useRef(0);

  const scan = async (encode: () => Promise<string>) => {
    const current = ++attempt.current;
    setState({ status: "reading" });
    const imageBase64 = await encode().catch(() => null);
    const result =
      imageBase64 === null ? null : await read(imageBase64).catch(() => null);
    if (current !== attempt.current) return;
    if (imageBase64 === null)
      setState({ status: "failed", message: messages.unsupportedImage });
    else if (!result) setState({ status: "failed", message: messages.error });
    else if (!result.success)
      setState({ status: "failed", message: result.error.message });
    else if (isEmptyReceiptScan(result.data)) setState({ status: "failed" });
    else {
      setLastScan(result.data);
      setState({ status: "found" });
    }
  };

  const fail = (message: string) => {
    attempt.current++;
    setState({ status: "failed", message });
  };

  const reset = () => {
    attempt.current++;
    setState({ status: "idle" });
  };

  const apply = () => {
    if (state.status !== "found" || !lastScan) return;
    const filled = filledBy(lastScan);
    const options = { shouldDirty: true, shouldValidate: true };
    if (filled.description !== undefined)
      setValue("description", filled.description, options);
    if (filled.currency !== undefined)
      setValue("currency", filled.currency, options);
    if (filled.amountInCents !== undefined)
      setValue("amountInCents", filled.amountInCents, options);
    if (filled.expenseDate !== undefined)
      setValue("expenseDate", filled.expenseDate, options);
    setApplied(filled);
    setState({ status: "idle" });
  };

  const preview = lastScan && {
    store: lastScan.description,
    amount:
      lastScan.amountInCents === null
        ? null
        : formatCurrencyFromCents({
            cents: lastScan.amountInCents,
            currency: lastScan.currency ?? currency,
            locale,
          }),
    date: lastScan.expenseDay
      ? formatExpenseDateShort(pickerDate(lastScan.expenseDay), locale)
      : null,
  };

  return {
    state,
    preview,
    scan,
    fail,
    reset,
    apply,
    // Tells us how often people correct what the scan filled in
    report: (values: ReceiptFormValues) =>
      applied ? receiptReport(applied, values) : undefined,
  };
}
