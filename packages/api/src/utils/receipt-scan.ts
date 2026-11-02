import type { ReceiptScan } from "@flatsby/validators/expenses/receipt-scan";
import { Effect } from "effect";

import { receiptScanFrom } from "@flatsby/validators/expenses/receipt-scan";

import type { ApiError } from "../errors";
import type { CreditUser } from "./autumn";
import { Errors, ExternalServiceError, fail } from "../errors";
import { chargeAIUsage, checkCredits } from "./autumn";
import { errorSummary, readReceipt } from "./model-provider";

export type ReceiptScanner = (
  user: CreditUser,
  imageBase64: string,
) => Effect.Effect<ReceiptScan, ApiError>;

export const scanReceipt: ReceiptScanner = (user, imageBase64) =>
  Effect.gen(function* () {
    const { allowed } = yield* Effect.tryPromise({
      try: () => checkCredits(user),
      catch: (cause) =>
        new ExternalServiceError({
          messageKey: "errors.creditCheckFailed",
          service: "autumn",
          operation: "check credits",
          cause,
        }),
    });
    if (!allowed) return yield* fail.forbidden("errors.outOfCredits");

    const { reading, providerMetadata } = yield* Effect.tryPromise({
      try: () =>
        readReceipt(imageBase64, {
          distinctId: user.id,
          traceId: crypto.randomUUID(),
          feature: "scan-receipt",
        }),
      // The error chain can quote the model's reading of the receipt
      catch: (cause) =>
        Errors.externalService(
          "gateway",
          "scan receipt",
          new Error(errorSummary(cause)),
        ),
    });
    yield* Effect.promise(() =>
      chargeAIUsage({ user, feature: "scan-receipt", providerMetadata }),
    );
    return receiptScanFrom(reading);
  });

// CI has no gateway or Autumn keys, so e2e reads this receipt instead of calling a model
export const e2eReceiptScanner: ReceiptScanner = () =>
  Effect.succeed({
    amountInCents: 2347,
    currency: "EUR",
    expenseDay: "2026-10-29",
    description: "REWE",
  });
