import type { Session } from "@flatsby/auth";
import { z } from "zod";

import { env } from "@flatsby/auth/env";
import { and, eq, sql } from "@flatsby/db";
import { db } from "@flatsby/db/client";
import { creditBalances } from "@flatsby/db/schema";
import { costToCredits, PLANS } from "@flatsby/validators/billing";

import { captureError } from "../lib/posthog";

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

// The database clock decides the month, so check and charge never disagree on it
const currentMonth = sql<string>`date_trunc('month', now() at time zone 'utc')::date`;

export type CreditUser = Pick<Session["user"], "id">;

export async function getCreditUsage(
  userId: string,
): Promise<{ balance: number; usage: number }> {
  const row = await db.query.creditBalances.findFirst({
    columns: { used: true },
    where: and(
      eq(creditBalances.userId, userId),
      eq(creditBalances.monthStart, currentMonth),
    ),
  });
  const usage = row?.used ?? 0;
  return { balance: Math.max(0, PLANS.freeCredits - usage), usage };
}

export async function checkCredits(
  user: CreditUser,
): Promise<{ allowed: boolean }> {
  // CI stacks have no AI keys; denying here keeps e2e from ever reaching a model
  if (env.E2E_TESTING) return { allowed: false };
  const { balance } = await getCreditUsage(user.id);
  return { allowed: balance > 0 };
}

export async function trackAIUsage({
  userId,
  cost,
}: {
  userId: string;
  cost: string | undefined;
}): Promise<void> {
  const credits = costToCredits(cost);
  if (credits <= 0) return;
  await db
    .insert(creditBalances)
    .values({ userId, monthStart: currentMonth, used: credits })
    .onConflictDoUpdate({
      target: [creditBalances.userId, creditBalances.monthStart],
      set: { used: sql`${creditBalances.used} + excluded.used` },
    });
}

// A failed charge is reported, never shown: the person already has their answer
export async function chargeAIUsage({
  user,
  feature,
  providerMetadata,
}: {
  user: CreditUser;
  feature: string;
  providerMetadata: Record<string, unknown> | undefined;
}): Promise<void> {
  try {
    await trackAIUsage({
      userId: user.id,
      cost: extractGatewayMetadata(providerMetadata)?.cost,
    });
  } catch (error) {
    captureError({
      error,
      operation: `track-${feature}-usage`,
      distinctId: user.id,
    });
  }
}
