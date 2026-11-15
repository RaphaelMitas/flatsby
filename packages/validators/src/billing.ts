import { z } from "zod/v4";

export const usageDataSchema = z.object({
  credits: z.object({ balance: z.number(), usage: z.number() }),
});

export const subscriptionDataSchema = z.object({
  planId: z.string(),
  planName: z.string(),
});

export const SUPPORT_EMAIL = "support@flatsby.com";
