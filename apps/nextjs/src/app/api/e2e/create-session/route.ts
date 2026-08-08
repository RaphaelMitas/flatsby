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

/**
 * E2E-only route: creates a unique test user, group, and session per call via
 * better-auth's testUtils plugin. Returns properly signed session cookies for
 * Playwright to inject.
 *
 * Every call mints a fresh user + group, so parallel tests are fully isolated
 * from each other regardless of worker count.
 *
 * Guarded to only work outside production.
 *
 * `?name=` and `?email=` override the user's display name and address (the
 * store-screenshot flow mints extra members with presentable identities).
 * Custom emails are confined to the e2e domain so the cleanup sweep still
 * owns them, and collide onto the existing row so reruns within the sweep
 * window keep working.
 */
async function upsertE2EUser(name: string, customEmail?: string) {
  const now = new Date();
  let userId = `e2e-${randomUUID()}`;
  const email = customEmail ?? `${userId}@${E2E_EMAIL_DOMAIN}`;

  const existingUser = customEmail
    ? await db.query.users.findFirst({
        columns: { id: true },
        where: eq(users.email, customEmail),
      })
    : undefined;

  if (existingUser) {
    userId = existingUser.id;
    // Refresh createdAt so a concurrent suite's stale-sweep can't delete the
    // user mid-flow.
    await db
      .update(users)
      .set({ name, createdAt: now, updatedAt: now })
      .where(eq(users.id, userId));
    // Deactivate memberships left over from previous runs; otherwise the
    // dashboard fills up with stale groups (splits reference memberships, so
    // rows can't be deleted here).
    await db
      .update(groupMembers)
      .set({ isActive: false })
      .where(eq(groupMembers.userId, userId));
  } else {
    await db.insert(users).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      termsAcceptedAt: now,
      termsVersion: "1.1",
      privacyAcceptedAt: now,
      privacyVersion: "1.1",
    });
  }

  await db
    .insert(accounts)
    .values({
      id: `e2e-account-${userId}`,
      accountId: `e2e-google-${userId}`,
      providerId: "google",
      userId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  return { userId, email };
}

function thirds(totalCents: number): [number, number, number] {
  const base = Math.floor(totalCents / 3);
  return [totalCents - 2 * base, base, base];
}

/**
 * Seeds the full store-screenshot scenario server-side: the "Sunset Villa"
 * group with three members, a stocked shopping list, and split expenses. The
 * screenshot flow then only logs in, navigates, and captures — it performs no
 * mutations, because a Maestro tap that silently misses a button would leave
 * state missing and the flow waiting on UI that never appears.
 */
async function seedStoreScenario(adminUserId: string, adminEmail: string) {
  const [group] = await db
    .insert(groups)
    .values({ name: "Sunset Villa" })
    .returning();
  if (!group) throw new Error("Failed to create seeded group");

  // The member identities carry the admin email's plus-tag (alex+ios@... ->
  // anna+ios@...): the iOS and Android screenshot jobs seed in parallel
  // against the same database, and shared fixed identities race — each
  // upsert deactivates the other platform's memberships mid-capture.
  const tagMatch = /\+([^@]+)@/.exec(adminEmail);
  const tag = tagMatch ? `+${tagMatch[1]}` : "";
  const anna = await upsertE2EUser(
    "Anna Keller",
    `anna${tag}@${E2E_EMAIL_DOMAIN}`,
  );
  const tom = await upsertE2EUser("Tom Baker", `tom${tag}@${E2E_EMAIL_DOMAIN}`);

  const memberRows = await db
    .insert(groupMembers)
    .values([
      { groupId: group.id, userId: adminUserId, role: "admin", isActive: true },
      {
        groupId: group.id,
        userId: anna.userId,
        role: "member",
        isActive: true,
      },
      { groupId: group.id, userId: tom.userId, role: "member", isActive: true },
    ])
    .returning({ id: groupMembers.id });
  const [alexMember, annaMember, tomMember] = memberRows;
  if (!alexMember || !annaMember || !tomMember) {
    throw new Error("Failed to create seeded memberships");
  }

  const [list] = await db
    .insert(shoppingLists)
    .values({ groupId: group.id, name: "Groceries" })
    .returning();
  if (!list) throw new Error("Failed to create seeded shopping list");

  await db.insert(shoppingListItems).values([
    {
      shoppingListId: list.id,
      name: "Apples",
      categoryId: "produce",
      createdByGroupMemberId: annaMember.id,
      completed: false,
    },
    {
      shoppingListId: list.id,
      name: "Oat Milk",
      categoryId: "dairy",
      createdByGroupMemberId: tomMember.id,
      completed: false,
    },
    {
      shoppingListId: list.id,
      name: "Sourdough Bread",
      categoryId: "bakery",
      createdByGroupMemberId: alexMember.id,
      completed: false,
    },
    {
      shoppingListId: list.id,
      name: "Paper Towels",
      categoryId: "household",
      createdByGroupMemberId: annaMember.id,
      completed: false,
    },
  ]);

  const dayMs = 24 * 60 * 60 * 1000;
  const seedExpenses = [
    {
      description: "Weekly shopping",
      amountInCents: 8420,
      category: "food-drinks",
      subcategory: "groceries",
      paidBy: alexMember.id,
      expenseDate: new Date(),
    },
    {
      description: "Internet bill",
      amountInCents: 3999,
      category: "utilities",
      subcategory: "internet",
      paidBy: annaMember.id,
      expenseDate: new Date(Date.now() - dayMs),
    },
    {
      description: "Cleaning supplies",
      amountInCents: 1850,
      category: "shopping",
      subcategory: "home-goods",
      paidBy: tomMember.id,
      expenseDate: new Date(Date.now() - 3 * dayMs),
    },
  ];
  for (const seed of seedExpenses) {
    const [expense] = await db
      .insert(expenses)
      .values({
        groupId: group.id,
        paidByGroupMemberId: seed.paidBy,
        amountInCents: seed.amountInCents,
        currency: "EUR",
        description: seed.description,
        category: seed.category,
        subcategory: seed.subcategory,
        expenseDate: seed.expenseDate,
        createdByGroupMemberId: seed.paidBy,
        splitMethod: "equal",
      })
      .returning({ id: expenses.id });
    if (!expense) throw new Error("Failed to create seeded expense");
    const [payerShare, ...otherShares] = thirds(seed.amountInCents);
    const otherMembers = [alexMember.id, annaMember.id, tomMember.id].filter(
      (id) => id !== seed.paidBy,
    );
    await db.insert(expenseSplits).values([
      {
        expenseId: expense.id,
        groupMemberId: seed.paidBy,
        amountInCents: payerShare,
      },
      ...otherMembers.map((groupMemberId, i) => ({
        expenseId: expense.id,
        groupMemberId,
        amountInCents: otherShares[i] ?? 0,
      })),
    ]);
  }

  return group;
}

export async function POST(request: Request) {
  if (!env.E2E_TESTING) {
    return NextResponse.json(
      { error: "E2E testing is not enabled" },
      { status: 403 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const nameParam = searchParams.get("name")?.trim();
  const name = nameParam ? nameParam.slice(0, 64) : "E2E Test User";
  const emailParam = searchParams.get("email")?.trim().toLowerCase();
  const seedStore = searchParams.get("seed") === "store";

  const customEmail =
    emailParam?.endsWith(`@${E2E_EMAIL_DOMAIN}`) && emailParam.length <= 128
      ? emailParam
      : undefined;

  const { userId, email } = await upsertE2EUser(name, customEmail);

  let group: { id: number };
  if (seedStore) {
    group = await seedStoreScenario(userId, email);
  } else {
    const [fixtureGroup] = await db
      .insert(groups)
      .values({ name: `E2E Test Group ${userId.slice(0, 12)}` })
      .returning();
    if (!fixtureGroup) {
      return NextResponse.json(
        { error: "Failed to create test group" },
        { status: 500 },
      );
    }
    await db.insert(groupMembers).values({
      groupId: fixtureGroup.id,
      userId,
      role: "admin",
      isActive: true,
    });
    group = fixtureGroup;
  }

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

  return NextResponse.json({
    userId,
    email,
    groupId: group.id,
    cookies: result.cookies,
    ok: true,
  });
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
