import { z } from "zod/v4";

import { trpcFailureSchema } from "@flatsby/api/trpcFailure";

import { MAX_LENGTH } from "~/utils/error-beacon";

export const errorReportSchema = z.object({
  name: z.string().max(MAX_LENGTH.name),
  message: z.string().max(MAX_LENGTH.message),
  stack: z.string().max(MAX_LENGTH.stack).optional(),
  url: z.url().max(MAX_LENGTH.url),
  mechanism: z.enum(["onerror", "onunhandledrejection", "trpc"]),
  trpc: trpcFailureSchema.optional(),
});

export type ErrorReport = z.infer<typeof errorReportSchema>;
