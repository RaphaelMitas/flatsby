import { scanReceiptInputSchema } from "@flatsby/validators/expenses/receipt-scan";

import { runResult } from "../effect/runtime";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { scanReceipt } from "../utils/receipt-scan";

// Reads no group data: the photo is the person's own, and credits gate every call
export const receiptRouter = createTRPCRouter({
  scan: protectedProcedure
    .input(scanReceiptInputSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        (ctx.scanReceipt ?? scanReceipt)(ctx.session.user, input.imageBase64),
      ),
    ),
});
