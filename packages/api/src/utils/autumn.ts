import type { Auth } from "@flatsby/auth";
import type { CheckResult } from "autumn-js";
import { TRPCError } from "@trpc/server";

import { AUTUMN_FEATURES, costToCredits } from "@flatsby/validators/billing";

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
