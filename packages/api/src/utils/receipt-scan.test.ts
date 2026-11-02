import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { chargeAIUsage } from "./autumn";
import { readReceipt } from "./model-provider";
import { scanReceipt } from "./receipt-scan";

const credits = vi.hoisted(() => ({ allowed: true }));

vi.mock("./autumn", () => ({
  checkCredits: () => Promise.resolve(credits),
  chargeAIUsage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./model-provider", () => ({
  readReceipt: vi.fn(),
  errorSummary: String,
}));

const user = { id: "user-1", name: "Test", email: "test@example.com" };

const scan = () =>
  Effect.runPromise(Effect.result(scanReceipt(user, "aGVsbG8=")));

describe("scanReceipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    credits.allowed = true;
  });

  it("never calls the model without credits", async () => {
    credits.allowed = false;
    const result = await scan();
    expect(result._tag).toBe("Failure");
    expect(readReceipt).not.toHaveBeenCalled();
  });

  it("charges for a receipt it read", async () => {
    vi.mocked(readReceipt).mockResolvedValue({
      reading: {
        isReceipt: true,
        total: 23.47,
        currency: "EUR",
        date: "2026-10-29",
        merchant: "REWE",
      },
      providerMetadata: undefined,
    });
    const result = await scan();
    expect(result._tag).toBe("Success");
    expect(chargeAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "scan-receipt" }),
    );
  });
});
