import type { CheckResponse } from "autumn-js";
import { TRPCError } from "@trpc/server";
import { Autumn } from "autumn-js";

import { env } from "@flatsby/auth/env";
import { AUTUMN_FEATURES, costToCredits } from "@flatsby/validators/billing";

import { captureError } from "../lib/posthog";

export const autumn = new Autumn({ secretKey: env.AUTUMN_SECRET_KEY });

export async function checkCredits({
  customerId,
}: {
  customerId: string;
}): Promise<CheckResponse> {
  try {
    const result = await autumn.check({
      customerId,
      featureId: AUTUMN_FEATURES.CREDITS,
    });
    return result;
  } catch (error) {
    captureError({
      error,
      operation: "billing.checkCredits",
      distinctId: customerId,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error checking credits",
    });
  }
}

export async function trackAIUsage({
  customerId,
  cost,
}: {
  customerId: string;
  cost: string | undefined;
}): Promise<void> {
  const credits = costToCredits(cost);
  if (credits > 0) {
    await autumn.track({
      customerId,
      featureId: AUTUMN_FEATURES.CREDITS,
      value: credits,
    });
  }
}
