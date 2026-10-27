import { describe, expect, it } from "vitest";

import { isExchangeRateFinal } from "./useExpenseConversion";

describe("isExchangeRateFinal", () => {
  it("keeps a rate fetched during its UTC day provisional", () => {
    expect(
      isExchangeRateFinal("2026-10-26", Date.parse("2026-10-26T23:59:59Z")),
    ).toBe(false);
  });

  it("treats a weekend rate fetched after the day as final", () => {
    expect(
      isExchangeRateFinal("2026-10-25", Date.parse("2026-10-27T08:00:00Z")),
    ).toBe(true);
  });
});
