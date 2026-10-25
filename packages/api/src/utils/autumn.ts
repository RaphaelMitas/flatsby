import type { Session } from "@flatsby/auth";
import type { CheckResponse } from "autumn-js";
import { Autumn, AutumnError } from "autumn-js";
import { z } from "zod";

import { env } from "@flatsby/auth/env";
import { AUTUMN_FEATURES, costToCredits } from "@flatsby/validators/billing";

const gatewayMetadataSchema = z
  .object({
    cost: z.string().optional(),
    generationId: z.string().optional(),
  })
  .optional();

export type GatewayMetadata = z.infer<typeof gatewayMetadataSchema>;

export function extractGatewayMetadata(
  providerMetadata: Record<string, unknown> | undefined,
): GatewayMetadata {
  const result = gatewayMetadataSchema.safeParse(providerMetadata?.gateway);
  return result.success ? result.data : undefined;
}

export const autumn = new Autumn({ secretKey: env.AUTUMN_SECRET_KEY });

const customerNotFoundSchema = z.object({
  code: z.literal("customer_not_found"),
});

function isCustomerNotFound(error: unknown): boolean {
  if (!(error instanceof AutumnError) || error.statusCode !== 404) return false;
  try {
    return customerNotFoundSchema.safeParse(JSON.parse(error.body)).success;
  } catch {
    return false;
  }
}

export type CreditUser = Pick<Session["user"], "id" | "name" | "email">;

export async function checkCredits(user: CreditUser): Promise<CheckResponse> {
  const params = { customerId: user.id, featureId: AUTUMN_FEATURES.CREDITS };
  try {
    return await autumn.check(params);
  } catch (error) {
    if (!isCustomerNotFound(error)) throw error;
    await autumn.customers.getOrCreate({
      customerId: user.id,
      name: user.name,
      email: user.email,
    });
    return autumn.check(params);
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
