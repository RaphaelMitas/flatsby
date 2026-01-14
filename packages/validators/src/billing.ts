import { z } from "zod/v4";

/**
 * Autumn billing feature IDs
 * These should match what's configured in the Autumn dashboard
 */
export const AUTUMN_FEATURES = {
  CREDITS: "credits",
} as const;

export type AutumnFeature =
  (typeof AUTUMN_FEATURES)[keyof typeof AUTUMN_FEATURES];

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
  return Math.round(numCost * CREDITS_PER_DOLLAR);
}

/**
 * Format credits for display
 */
export function formatCredits(credits: number): string {
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(1)}M`;
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(1)}K`;
  }
  return credits.toLocaleString();
}

/**
 * Schema for credit feature data returned from Autumn
 */
export const creditFeatureSchema = z.object({
  balance: z.number(),
  usage: z.number(),
});

export type CreditFeature = z.infer<typeof creditFeatureSchema>;

/**
 * Schema for usage data response
 */
export const usageDataSchema = z.object({
  credits: creditFeatureSchema.nullable(),
});

export type UsageData = z.infer<typeof usageDataSchema>;
