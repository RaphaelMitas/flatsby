import { describe, expect, it } from "vitest";

import type { ReceiptReading } from "./receipt-scan";
import {
  isEmptyReceiptScan,
  MIN_READING_MS,
  receiptReport,
  receiptScanFrom,
  stageTimeline,
} from "./receipt-scan";

const reading = (overrides: Partial<ReceiptReading>): ReceiptReading => ({
  isReceipt: true,
  total: 23.47,
  currency: "EUR",
  date: "2026-10-29",
  merchant: "REWE",
  ...overrides,
});

describe("receiptScanFrom", () => {
  it("keeps every value a readable receipt printed", () => {
    expect(receiptScanFrom(reading({}), "2026-10-31")).toEqual({
      amountInCents: 2347,
      currency: "EUR",
      expenseDay: "2026-10-29",
      description: "REWE",
    });
  });

  it("drops currencies the app can't book, and their amounts", () => {
    const yen = receiptScanFrom(reading({ currency: "jpy" }), "2026-10-31");
    expect(yen.currency).toBeNull();
    expect(yen.amountInCents).toBeNull();
    expect(
      receiptScanFrom(reading({ currency: null }), "2026-10-31").amountInCents,
    ).toBe(2347);
    expect(
      receiptScanFrom(reading({ currency: "€" }), "2026-10-31").currency,
    ).toBe("EUR");
    expect(
      receiptScanFrom(reading({ currency: "chf" }), "2026-10-31").currency,
    ).toBe("CHF");
  });

  it("drops dates the person can't have paid on yet", () => {
    expect(
      receiptScanFrom(reading({ date: "2026-11-01" }), "2026-10-31").expenseDay,
    ).toBe("2026-11-01");
    expect(
      receiptScanFrom(reading({ date: "2026-11-02" }), "2026-10-31").expenseDay,
    ).toBeNull();
    expect(
      receiptScanFrom(reading({ date: "29.10.2026" }), "2026-10-31").expenseDay,
    ).toBeNull();
  });

  it("drops zero and negative totals", () => {
    expect(
      receiptScanFrom(reading({ total: 0 }), "2026-10-31").amountInCents,
    ).toBeNull();
    expect(
      receiptScanFrom(reading({ total: -5 }), "2026-10-31").amountInCents,
    ).toBeNull();
  });

  it("keeps a currency only together with its amount", () => {
    expect(
      receiptScanFrom(reading({ total: null, currency: "CHF" }), "2026-10-31")
        .currency,
    ).toBeNull();
  });

  it("treats a scan that only found a currency as unreadable", () => {
    expect(
      isEmptyReceiptScan(
        receiptScanFrom(
          reading({ total: null, date: null, merchant: null }),
          "2026-10-31",
        ),
      ),
    ).toBe(true);
  });

  it("returns nothing for an image that isn't a receipt", () => {
    expect(
      isEmptyReceiptScan(
        receiptScanFrom(reading({ isReceipt: false }), "2026-10-31"),
      ),
    ).toBe(true);
  });
});

describe("receiptReport", () => {
  const values = {
    amountInCents: 2347,
    currency: "EUR" as const,
    expenseDate: new Date(2026, 9, 29, 14, 30),
    description: "REWE Markt",
  };

  it("lists only the fields the scan filled, and which of those changed", () => {
    expect(
      receiptReport(
        {
          amountInCents: 2347,
          expenseDate: new Date(2026, 9, 29),
          description: "REWE",
        },
        values,
      ),
    ).toEqual({
      filled: ["amountInCents", "expenseDate", "description"],
      edited: ["description"],
    });
  });
});

describe("stageTimeline", () => {
  const scan = {
    amountInCents: 2347,
    currency: "EUR" as const,
    expenseDay: null,
    description: "REWE",
  };

  it("holds a fast answer until the cat has had one look", () => {
    const [first] = stageTimeline({ scan, readingFor: 200, reduced: false });
    expect(first).toEqual({ at: MIN_READING_MS - 200, phase: "revealing" });
  });

  it("reveals only what the receipt had, then shows the preview", () => {
    const events = stageTimeline({ scan, readingFor: 5000, reduced: false });
    expect(events.flatMap((e) => (e.reveal ? [e.reveal] : []))).toEqual([
      "store",
      "amount",
    ]);
    expect(events.at(-1)?.phase).toBe("preview");
  });

  it("ends a failed read with the stage closed", () => {
    const events = stageTimeline({ scan: null, readingFor: 0, reduced: false });
    expect(events.map((e) => e.phase)).toEqual(["failing", "closed"]);
  });

  it("skips the waiting when motion is reduced", () => {
    const events = stageTimeline({ scan, readingFor: 0, reduced: true });
    expect(events.every((e) => e.at <= 150)).toBe(true);
  });
});
