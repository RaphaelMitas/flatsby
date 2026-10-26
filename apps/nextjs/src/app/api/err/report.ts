import { z } from "zod/v4";

import { trpcFailureSchema } from "@flatsby/api/trpcFailure";

export const MAX_LENGTH = {
  name: 200,
  message: 2000,
  stack: 10_000,
  url: 2048,
};

export const errorReportSchema = z.object({
  name: z.string().max(MAX_LENGTH.name),
  message: z.string().max(MAX_LENGTH.message),
  stack: z.string().max(MAX_LENGTH.stack).optional(),
  url: z.url().max(MAX_LENGTH.url),
  mechanism: z.enum(["onerror", "onunhandledrejection", "trpc"]),
  trpc: trpcFailureSchema.optional(),
});

export type ErrorReport = z.infer<typeof errorReportSchema>;
