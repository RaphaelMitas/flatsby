import {
  filledBy,
  isEmptyReceiptScan,
  receiptScanFailureSchema,
  receiptScanSchema,
  scanReceiptInputSchema,
} from "@flatsby/validators/expenses/receipt-scan";

import { runResult } from "../effect/runtime";
import { getApiResultZod } from "../errors";
import { captureUserEvent } from "../lib/posthog";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { scanReceipt } from "../utils/receipt-scan";

// Reads no group data: the file is the person's own, and credits gate every call
export const receiptRouter = createTRPCRouter({
  scan: protectedProcedure
    .input(scanReceiptInputSchema)
    .output(getApiResultZod(receiptScanSchema))
    .mutation(async ({ ctx, input }) => {
      const result = await runResult(
        ctx,
        (ctx.scanReceipt ?? scanReceipt)(ctx.session.user, input),
      );
      captureUserEvent({
        user: ctx.session.user,
        headers: ctx.headers,
        ...(result.success
          ? {
              event: "receipt_scanned",
              additionalProperties: {
                mediaType: input.mediaType,
                readable: !isEmptyReceiptScan(result.data),
                found: Object.keys(filledBy(result.data)),
              },
            }
          : {
              event: "receipt_scan_failed",
              additionalProperties: {
                mediaType: input.mediaType,
                reason: result.error.details.messageKey,
              },
            }),
      });
      return result;
    }),

  reportFailure: protectedProcedure
    .input(receiptScanFailureSchema)
    .mutation(({ ctx, input }) => {
      captureUserEvent({
        user: ctx.session.user,
        event: "receipt_scan_failed",
        headers: ctx.headers,
        additionalProperties: input,
      });
    }),
});
