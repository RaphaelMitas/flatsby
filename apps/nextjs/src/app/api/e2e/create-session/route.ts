import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@flatsby/db/client";
import { accounts, sessions, users } from "@flatsby/db/schema";

import { auth } from "~/auth/server";
import { env } from "~/env";

const TEST_USER = {
  id: "e2e-test-user-001",
  name: "E2E Test User",
  email: "e2e-test@flatsby.test",
} as const;

/**
 * E2E-only route: creates a test user and session via better-auth's testUtils plugin.
 * Returns properly signed session cookies for Playwright to inject.
 * Guarded to only work outside production.
 */
export async function POST() {
  if (!env.E2E_TESTING) {
    return NextResponse.json(
      { error: "E2E testing is not enabled" },
      { status: 403 },
    );
  }

  const now = new Date();

  // Seed user (upsert)
  await db
    .insert(users)
    .values({
      id: TEST_USER.id,
      name: TEST_USER.name,
      email: TEST_USER.email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      termsAcceptedAt: now,
      termsVersion: "1.1",
      privacyAcceptedAt: now,
      privacyVersion: "1.1",
    })
    .onConflictDoNothing();

  // Seed account (upsert)
  await db
    .insert(accounts)
    .values({
      id: `e2e-account-${TEST_USER.id}`,
      accountId: "e2e-google-id",
      providerId: "google",
      userId: TEST_USER.id,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // Clean up any existing test sessions
  await db.delete(sessions).where(eq(sessions.userId, TEST_USER.id));

  // Use better-auth's testUtils plugin to create a properly signed session
  const ctx = await auth.$context;
  const testHelpers = (ctx as Record<string, unknown>).test as
    | {
        login: (opts: { userId: string }) => Promise<{
          cookies: {
            name: string;
            value: string;
            domain: string;
            path: string;
            httpOnly: boolean;
            secure: boolean;
            sameSite: string;
            expires?: number;
          }[];
          token: string;
        }>;
      }
    | undefined;

  if (!testHelpers?.login) {
    return NextResponse.json(
      {
        error:
          "testUtils plugin not available. Ensure NODE_ENV !== production.",
      },
      { status: 500 },
    );
  }

  const result = await testHelpers.login({ userId: TEST_USER.id });

  return NextResponse.json({
    userId: TEST_USER.id,
    cookies: result.cookies,
    ok: true,
  });
}

/**
 * Cleanup route: removes test user and associated data.
 */
export async function DELETE() {
  if (!env.E2E_TESTING) {
    return NextResponse.json(
      { error: "E2E testing is not enabled" },
      { status: 403 },
    );
  }

  await db.delete(sessions).where(eq(sessions.userId, TEST_USER.id));
  await db.delete(accounts).where(eq(accounts.userId, TEST_USER.id));
  await db.delete(users).where(eq(users.id, TEST_USER.id));

  return NextResponse.json({ ok: true });
}
