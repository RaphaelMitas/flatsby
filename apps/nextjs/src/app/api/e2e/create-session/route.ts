import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray, like, lt, or } from "drizzle-orm";

import { db } from "@flatsby/db/client";
import {
  accounts,
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  sessions,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";

import { auth } from "~/auth/server";
import { env } from "~/env";

const E2E_EMAIL_DOMAIN = "flatsby.test";

const isSameSite = (v: unknown): v is "lax" | "strict" | "none" =>
  v === "lax" || v === "strict" || v === "none";

/**
 * E2E-only route: creates a unique test user, group, and session per call via
 * better-auth's testUtils plugin. Returns properly signed session cookies for
 * Playwright to inject.
 *
 * Every call mints a fresh user + group, so parallel tests are fully isolated
 * from each other regardless of worker count.
 *
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
  const userId = `e2e-${randomUUID()}`;
  const email = `${userId}@${E2E_EMAIL_DOMAIN}`;

  await db.insert(users).values({
    id: userId,
    name: "E2E Test User",
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    termsAcceptedAt: now,
    termsVersion: "1.1",
    privacyAcceptedAt: now,
    privacyVersion: "1.1",
  });

  await db.insert(accounts).values({
    id: `e2e-account-${userId}`,
    accountId: `e2e-google-${userId}`,
    providerId: "google",
    userId,
    createdAt: now,
    updatedAt: now,
  });

  const [group] = await db
    .insert(groups)
    .values({ name: `E2E Test Group ${userId.slice(0, 12)}` })
    .returning();

  if (!group) {
    return NextResponse.json(
      { error: "Failed to create test group" },
      { status: 500 },
    );
  }

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    role: "admin",
    isActive: true,
  });

  await db
    .update(users)
    .set({ lastGroupUsed: group.id })
    .where(eq(users.id, userId));

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

  const result = await testHelpers.login({ userId });

  const response = NextResponse.json({
    userId,
    email,
    groupId: group.id,
    cookies: result.cookies,
    ok: true,
  });

  for (const cookie of result.cookies) {
    response.cookies.set(cookie.name, cookie.value, {
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: isSameSite(cookie.sameSite) ? cookie.sameSite : undefined,
      expires: cookie.expires ? new Date(cookie.expires * 1000) : undefined,
    });
  }

  return response;
}

const STALE_AFTER_MS = 60 * 60 * 1000;

/**
 * Cleanup route: removes stale E2E test users and their associated data
 * (groups, expenses, shopping lists, sessions).
 *
 * Only data older than one hour is deleted, so concurrent test suites
 * sharing a database never delete each other's in-flight users. Each suite's
 * own leftovers are swept by whichever cleanup runs an hour later.
 */
export async function DELETE() {
  if (!env.E2E_TESTING) {
    return NextResponse.json(
      { error: "E2E testing is not enabled" },
      { status: 403 },
    );
  }

  const staleCutoff = new Date(Date.now() - STALE_AFTER_MS);

  const e2eUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        like(users.email, `%@${E2E_EMAIL_DOMAIN}`),
        lt(users.createdAt, staleCutoff),
      ),
    );
  const userIds = e2eUsers.map((u) => u.id);

  // Groups the stale e2e users belong to, plus any orphaned E2E-named groups
  // past the cutoff (e.g. created via the UI by an already-deleted user)
  const memberships =
    userIds.length > 0
      ? await db
          .select({ groupId: groupMembers.groupId })
          .from(groupMembers)
          .where(inArray(groupMembers.userId, userIds))
      : [];
  const namedGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(
      and(
        or(
          like(groups.name, "E2E Test Group%"),
          like(groups.name, "E2E Group%"),
        ),
        lt(groups.createdAt, staleCutoff),
      ),
    );
  const groupIds = [
    ...new Set([
      ...memberships.map((m) => m.groupId),
      ...namedGroups.map((g) => g.id),
    ]),
  ];

  if (userIds.length > 0) {
    await db
      .update(users)
      .set({ lastGroupUsed: null, lastShoppingListUsed: null })
      .where(inArray(users.id, userIds));
  }

  if (groupIds.length > 0) {
    const groupExpenses = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(inArray(expenses.groupId, groupIds));
    const expenseIds = groupExpenses.map((e) => e.id);
    if (expenseIds.length > 0) {
      await db
        .delete(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseIds));
      await db.delete(expenses).where(inArray(expenses.id, expenseIds));
    }

    const lists = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(inArray(shoppingLists.groupId, groupIds));
    const listIds = lists.map((l) => l.id);
    if (listIds.length > 0) {
      await db
        .delete(shoppingListItems)
        .where(inArray(shoppingListItems.shoppingListId, listIds));
      await db.delete(shoppingLists).where(inArray(shoppingLists.id, listIds));
    }

    await db
      .delete(groupMembers)
      .where(inArray(groupMembers.groupId, groupIds));
    await db.delete(groups).where(inArray(groups.id, groupIds));
  }

  if (userIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.userId, userIds));
    await db.delete(accounts).where(inArray(accounts.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }

  return NextResponse.json({
    ok: true,
    deletedUsers: userIds.length,
    deletedGroups: groupIds.length,
  });
}
