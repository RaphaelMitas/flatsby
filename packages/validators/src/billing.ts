import { z } from "zod/v4";

export const PLAN_IDS = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
  PRO_APPLE: "pro_apple",
} as const;

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS];

export const PLANS = {
  freeCredits: 5000,
  starterPrice: 4.99,
  starterCredits: 40000,
  proPrice: 9.99,
  proCredits: 100000,
  proAppStorePrice: 7.99,
};

/**
 * Credits conversion rate: 1 credit = $0.00001
 */
export const CREDITS_PER_DOLLAR = 10_000;

/**
 * Convert cost (USD) to credits
 */
export function costToCredits(cost: string | number | undefined): number {
  if (cost == null) return 0;
  const numCost = typeof cost === "string" ? parseFloat(cost) : cost;
  return Number.isFinite(numCost)
    ? Math.round(numCost * CREDITS_PER_DOLLAR)
    : 0;
}

/**
 * Format credits for display
 */
export function formatCredits(credits: number, locale: string): string {
  const oneDecimal = (value: number) =>
    value.toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  if (credits >= 1_000_000) {
    return `${oneDecimal(credits / 1_000_000)}M`;
  }
  if (credits >= 1_000) {
    return `${oneDecimal(credits / 1_000)}K`;
  }
  return credits.toLocaleString(locale);
}

export const creditFeatureSchema = z.object({
  balance: z.number(),
  usage: z.number(),
});

export type CreditFeature = z.infer<typeof creditFeatureSchema>;

export const usageDataSchema = z.object({
  credits: creditFeatureSchema,
});

export type UsageData = z.infer<typeof usageDataSchema>;

export const subscriptionDataSchema = z.object({
  planId: z.string(),
  planName: z.string(),
});

export type SubscriptionData = z.infer<typeof subscriptionDataSchema>;
