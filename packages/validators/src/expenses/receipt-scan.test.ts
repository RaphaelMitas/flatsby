import { describe, expect, it } from "vitest";

import type { ReceiptReading } from "./receipt-scan";
import { isEmptyReceiptScan, receiptScanFrom } from "./receipt-scan";

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

  it("drops currencies the app can't book", () => {
    expect(
      receiptScanFrom(reading({ currency: "jpy" }), "2026-10-31").currency,
    ).toBeNull();
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

  it("returns nothing for an image that isn't a receipt", () => {
    expect(
      isEmptyReceiptScan(
        receiptScanFrom(reading({ isReceipt: false }), "2026-10-31"),
      ),
    ).toBe(true);
  });
});
