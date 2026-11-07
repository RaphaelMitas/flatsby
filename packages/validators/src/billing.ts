import { z } from "zod/v4";

// A fair-use cap far above normal use, not something anyone buys more of
export const FREE_MONTHLY_CREDITS = 5000;

// 1 credit = $0.0001 of AI cost
const CREDITS_PER_DOLLAR = 10_000;

export function costToCredits(cost: string | number | undefined): number {
  if (cost == null) return 0;
  const numCost = typeof cost === "string" ? parseFloat(cost) : cost;
  return Number.isFinite(numCost)
    ? Math.round(numCost * CREDITS_PER_DOLLAR)
    : 0;
}

// Only released app builds call getUsage and getSubscription; they decide what to show from these shapes
export const usageDataSchema = z.object({
  credits: z.object({ balance: z.number(), usage: z.number() }),
});

export const subscriptionDataSchema = z.object({
  planId: z.string(),
  planName: z.string(),
});

export const SUPPORT_EMAIL = "support@flatsby.com";
