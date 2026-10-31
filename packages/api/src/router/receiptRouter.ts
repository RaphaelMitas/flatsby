import {
  filledBy,
  isEmptyReceiptScan,
  receiptScanSchema,
  scanReceiptInputSchema,
} from "@flatsby/validators/expenses/receipt-scan";

import { runResult } from "../effect/runtime";
import { getApiResultZod } from "../errors";
import { captureUserEvent } from "../lib/posthog";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { scanReceipt } from "../utils/receipt-scan";

// Reads no group data: the photo is the person's own, and credits gate every call
export const receiptRouter = createTRPCRouter({
  scan: protectedProcedure
    .input(scanReceiptInputSchema)
    .output(getApiResultZod(receiptScanSchema))
    .mutation(async ({ ctx, input }) => {
      const result = await runResult(
        ctx,
        (ctx.scanReceipt ?? scanReceipt)(ctx.session.user, input.imageBase64),
      );
      if (result.success) {
        captureUserEvent({
          user: ctx.session.user,
          event: "receipt_scanned",
          headers: ctx.headers,
          additionalProperties: {
            readable: !isEmptyReceiptScan(result.data),
            found: Object.keys(filledBy(result.data)),
          },
        });
      }
      return result;
    }),
});
