import { TRPCError } from "@trpc/server";
import { CheckResult } from "autumn-js";

import { Auth } from "@flatsby/auth";

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
export const CREDITS_PER_DOLLAR = 100_000;

/**
 * Convert cost string from gateway to credits
 */
export function costToCredits(cost: string | undefined): number {
  if (!cost) return 0;
  return Math.round(parseFloat(cost) * CREDITS_PER_DOLLAR);
}

export async function checkCredits({
  authApi,
  headers,
}: {
  authApi: Auth["api"];
  headers: Headers;
}): Promise<CheckResult> {
  try {
    const result: CheckResult = (await authApi.check({
      headers,
      body: { featureId: AUTUMN_FEATURES.CREDITS },
    })) as CheckResult;
    return result;
  } catch (error) {
    console.error("Error checking credits:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error checking credits",
    });
  }
}

export async function trackAIUsage({
  authApi,
  headers,
  cost,
}: {
  authApi: Auth["api"];
  headers: Headers;
  cost: string | undefined;
}): Promise<void> {
  const credits = costToCredits(cost);
  if (credits > 0) {
    await authApi.track({
      headers,
      body: { featureId: AUTUMN_FEATURES.CREDITS, value: credits },
    });
  }
}
