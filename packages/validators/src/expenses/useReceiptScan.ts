import { useEffect, useRef, useState } from "react";

import type {
  Filled,
  ReceiptFormValues,
  ReceiptScan,
  StageEvent,
  StagePhase,
  StageTag,
} from "./receipt-scan";
import type { CurrencyCode } from "./types";
import { pickerDate } from "../calendar";
import { formatCurrencyFromCents, formatExpenseDateShort } from "./formatting";
import {
  filledBy,
  isEmptyReceiptScan,
  receiptReport,
  stageTimeline,
} from "./receipt-scan";

type ScanResult =
  | { success: true; data: ReceiptScan }
  | { success: false; error: { message: string } };

type ReceiptScanState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "found" }
  // Without a message the receipt was read but nothing on it was usable
  | { status: "failed"; message?: string };

interface SetOptions {
  shouldDirty: boolean;
  shouldValidate: boolean;
}

// validators has no react-hook-form dependency; form.setValue satisfies this
interface SetReceiptValue {
  (name: "amountInCents", value: number, options: SetOptions): void;
  (name: "currency", value: CurrencyCode, options: SetOptions): void;
  (name: "expenseDate", value: Date, options: SetOptions): void;
  (name: "description", value: string, options: SetOptions): void;
}

const APPLIED_HIGHLIGHT_MS = 1500;

export function useReceiptScan({
  read,
  setValue,
  currency,
  locale,
  reducedMotion,
  messages,
}: {
  read: (imageBase64: string) => Promise<ScanResult>;
  setValue: SetReceiptValue;
  currency: CurrencyCode;
  locale: Intl.LocalesArgument;
  reducedMotion: boolean;
  messages: { error: string; unsupportedImage: string };
}) {
  const [state, setState] = useState<ReceiptScanState>({ status: "idle" });
  const [applied, setApplied] = useState<Filled>();
  // Outlives the found state so the preview keeps its rows while it animates closed
  const [lastScan, setLastScan] = useState<ReceiptScan>();
  const attempt = useRef(0);
  const [stage, setStage] = useState<{
    phase: StagePhase;
    revealed: StageTag[];
  }>({ phase: "closed", revealed: [] });
  const [justApplied, setJustApplied] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  };
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  const playStage = (events: StageEvent[]) => {
    clearTimers();
    for (const event of events) {
      timers.current.push(
        setTimeout(
          () =>
            setStage((current) => ({
              phase: event.phase ?? current.phase,
              revealed: event.reveal
                ? [...current.revealed, event.reveal]
                : current.revealed,
            })),
          event.at,
        ),
      );
    }
  };

  const scan = async (encode: () => Promise<string>) => {
    const current = ++attempt.current;
    const startedAt = Date.now();
    clearTimers();
    setState({ status: "reading" });
    setStage({ phase: "reading", revealed: [] });
    const imageBase64 = await encode().catch(() => null);
    const result =
      imageBase64 === null ? null : await read(imageBase64).catch(() => null);
    if (current !== attempt.current) return;
    const found =
      result?.success && !isEmptyReceiptScan(result.data) ? result.data : null;
    playStage(
      stageTimeline({
        scan: found,
        readingFor: Date.now() - startedAt,
        reduced: reducedMotion,
      }),
    );
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
    clearTimers();
    setStage({ phase: "closed", revealed: [] });
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
    clearTimers();
    setStage({ phase: "closed", revealed: [] });
    setJustApplied(true);
    timers.current.push(
      setTimeout(() => setJustApplied(false), APPLIED_HIGHLIGHT_MS),
    );
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
    stage,
    justApplied,
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
