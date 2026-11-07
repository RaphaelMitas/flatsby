import type { Session } from "@flatsby/auth";
import { z } from "zod";

import { env } from "@flatsby/auth/env";
import { and, eq, sql } from "@flatsby/db";
import { db } from "@flatsby/db/client";
import { creditBalances } from "@flatsby/db/schema";

import { captureError } from "../lib/posthog";

const gatewayCostSchema = z.object({ cost: z.string().optional() }).optional();

function gatewayCost(providerMetadata: Record<string, unknown> | undefined) {
  return gatewayCostSchema.safeParse(providerMetadata?.gateway).data?.cost;
}

// A fair-use cap far above normal use
export const FREE_MONTHLY_CREDITS = 5000;

const CREDITS_PER_DOLLAR = 10_000;

function costToCredits(cost: string | undefined): number {
  const numCost = parseFloat(cost ?? "");
  return Number.isFinite(numCost)
    ? Math.round(numCost * CREDITS_PER_DOLLAR)
    : 0;
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
  return { balance: Math.max(0, FREE_MONTHLY_CREDITS - usage), usage };
}

export async function checkCredits(
  user: CreditUser,
): Promise<{ allowed: boolean }> {
  // CI stacks have no AI keys; denying here keeps e2e from ever reaching a model
  if (env.E2E_TESTING) return { allowed: false };
  const { balance } = await getCreditUsage(user.id);
  return { allowed: balance > 0 };
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
  const credits = costToCredits(gatewayCost(providerMetadata));
  if (credits <= 0) return;
  try {
    await db
      .insert(creditBalances)
      .values({ userId: user.id, monthStart: currentMonth, used: credits })
      .onConflictDoUpdate({
        target: [creditBalances.userId, creditBalances.monthStart],
        set: { used: sql`${creditBalances.used} + excluded.used` },
      });
  } catch (error) {
    captureError({
      error,
      operation: `track-${feature}-usage`,
      distinctId: user.id,
    });
  }
}
