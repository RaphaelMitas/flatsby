import { randomUUID } from "node:crypto";
import type { Locale } from "@flatsby/i18n/locale";
import type { PersistedToolCall } from "@flatsby/validators/chat/tools";
import { NextResponse } from "next/server";
import { and, eq, inArray, like, lt, or } from "drizzle-orm";

import { db } from "@flatsby/db/client";
import {
  accounts,
  calendarItemMembers,
  calendarItems,
  calendarOccurrences,
  chatMessages,
  conversations,
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  passkeys,
  sessions,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import { isLocale } from "@flatsby/i18n/locale";
import { CURRENT_AI_CONSENT_VERSION } from "@flatsby/validators/ai-consent";
import { addDays, localDate, weekdayOf } from "@flatsby/validators/calendar";
import { DEFAULT_CHAT_MODEL } from "@flatsby/validators/models";

import { auth } from "~/auth/server";
import { env } from "~/env";
import { E2E_EMAIL_DOMAIN } from "../email-domain";

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

const STORE_COPY = {
  en: {
    group: "Sunset Villa",
    list: "Groceries",
    items: {
      apples: "Apples",
      oatMilk: "Oat Milk",
      bread: "Sourdough Bread",
      paperTowels: "Paper Towels",
    },
    expenses: {
      shopping: "Weekly shopping",
      internet: "Internet bill",
      cleaning: "Cleaning supplies",
    },
    calendar: {
      bins: "Take out bins",
      bathroom: "Clean bathroom",
      plants: "Water the plants",
      dinner: "Flat dinner",
      movies: "Movie night",
      rent: "Rent due",
    },
    chat: {
      title: "Spending overview",
      chartTitle: "Spending by category",
      categories: {
        food: "Food & Drinks",
        utilities: "Utilities",
        shopping: "Shopping",
      },
      question: "How is our spending looking this month?",
      answer:
        "Sunset Villa spent **€142.69** this month across three expenses. " +
        "Food & drinks was the biggest chunk at €84.20, followed by " +
        "utilities at €39.99 and shopping at €18.50. Here's the breakdown:",
    },
  },
  de: {
    group: "WG Sonnenblick",
    list: "Einkauf",
    items: {
      apples: "Äpfel",
      oatMilk: "Hafermilch",
      bread: "Sauerteigbrot",
      paperTowels: "Küchenrolle",
    },
    expenses: {
      shopping: "Wocheneinkauf",
      internet: "Internetrechnung",
      cleaning: "Putzmittel",
    },
    calendar: {
      bins: "Müll rausbringen",
      bathroom: "Bad putzen",
      plants: "Pflanzen gießen",
      dinner: "WG-Abendessen",
      movies: "Filmabend",
      rent: "Miete fällig",
    },
    chat: {
      title: "Ausgabenübersicht",
      chartTitle: "Ausgaben nach Kategorie",
      categories: {
        food: "Essen & Trinken",
        utilities: "Nebenkosten",
        shopping: "Shopping",
      },
      question: "Wie sehen unsere Ausgaben diesen Monat aus?",
      answer:
        "Die WG Sonnenblick hat diesen Monat **142,69 €** für drei Ausgaben " +
        "ausgegeben. Essen & Trinken war mit 84,20 € der größte Posten, " +
        "danach Nebenkosten mit 39,99 € und Shopping mit 18,50 €. " +
        "Hier die Aufteilung:",
    },
  },
} satisfies Record<Locale, unknown>;

/**
 * Seeds the full store-screenshot scenario server-side: a group with three
 * members, a stocked list, expenses and a calendar. The screenshot flow then
 * only logs in, navigates, and captures — it performs no mutations, because a
 * Maestro tap that silently misses a button would leave state missing and the
 * flow waiting on UI that never appears.
 */
async function seedStoreScenario(
  adminUserId: string,
  adminEmail: string,
  locale: Locale,
) {
  const copy = STORE_COPY[locale];
  const [group] = await db
    .insert(groups)
    .values({ name: copy.group })
    .returning();
  if (!group) throw new Error("Failed to create seeded group");

  // The member identities carry the admin email's platform tag (alex-ios@...
  // -> anna-ios@...): the iOS and Android screenshot jobs seed in parallel
  // against the same database, and shared fixed identities race — each
  // upsert deactivates the other platform's memberships mid-capture. The tag
  // is hyphenated, not plus-addressed: a "+" in the deep link's query string
  // decodes to a space in the app's route params, which seeded an admin
  // email with a space — every procedure returning it then failed its own
  // output validation (runs 31273748894 and 31276180622).
  const platformTag = /-(ios|android)@/i.exec(adminEmail)?.[1];
  const tag = platformTag ? `-${platformTag.toLowerCase()}` : "";
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
    .values({ groupId: group.id, name: copy.list })
    .returning();
  if (!list) throw new Error("Failed to create seeded shopping list");

  await db.insert(shoppingListItems).values([
    {
      shoppingListId: list.id,
      name: copy.items.apples,
      categoryId: "produce",
      createdByGroupMemberId: annaMember.id,
      completed: false,
    },
    {
      shoppingListId: list.id,
      name: copy.items.oatMilk,
      categoryId: "dairy",
      createdByGroupMemberId: tomMember.id,
      completed: false,
    },
    {
      shoppingListId: list.id,
      name: copy.items.bread,
      categoryId: "bakery",
      createdByGroupMemberId: alexMember.id,
      completed: false,
    },
    {
      shoppingListId: list.id,
      name: copy.items.paperTowels,
      categoryId: "household",
      createdByGroupMemberId: annaMember.id,
      completed: false,
    },
  ]);

  const dayMs = 24 * 60 * 60 * 1000;
  const seedExpenses = [
    {
      description: copy.expenses.shopping,
      amountInCents: 8420,
      category: "food-drinks",
      subcategory: "groceries",
      paidBy: alexMember.id,
      expenseDate: new Date(),
    },
    {
      description: copy.expenses.internet,
      amountInCents: 3999,
      category: "utilities",
      subcategory: "internet",
      paidBy: annaMember.id,
      expenseDate: new Date(Date.now() - dayMs),
    },
    {
      description: copy.expenses.cleaning,
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

  await seedStoreCalendar(
    group.id,
    [alexMember.id, annaMember.id, tomMember.id],
    copy.calendar,
  );

  // A canned conversation so screenshots show the AI answering with a chart
  // without any model call. Consent must be current or the gate covers the
  // screen.
  await db
    .update(users)
    .set({
      aiConsentAcceptedAt: new Date(),
      aiConsentVersion: CURRENT_AI_CONSENT_VERSION,
    })
    .where(eq(users.id, adminUserId));

  // Reruns reuse the user (retries, the local sweep window), and each seed
  // would stack another copy of the conversation into the sidebar and the
  // dashboard's message count; messages cascade with the conversation.
  await db.delete(conversations).where(eq(conversations.userId, adminUserId));

  const [conversation] = await db
    .insert(conversations)
    .values({
      userId: adminUserId,
      title: copy.chat.title,
      model: DEFAULT_CHAT_MODEL,
    })
    .returning({ id: conversations.id });
  if (!conversation) throw new Error("Failed to create seeded conversation");

  const chartToolCall: PersistedToolCall = {
    id: `${conversation.id}-chart`,
    name: "showUI",
    input: {
      component: "chart",
      config: {
        title: copy.chat.chartTitle,
        chartType: "pie",
        data: [
          { label: copy.chat.categories.food, value: 84.2 },
          { label: copy.chat.categories.utilities, value: 39.99 },
          { label: copy.chat.categories.shopping, value: 18.5 },
        ],
      },
    },
    output: { rendered: true },
  };
  // Both rows would otherwise share one transaction timestamp, and the
  // conversation is ordered by createdAt with no tiebreaker, so the answer
  // could render above the question.
  const askedAt = new Date();
  await db.insert(chatMessages).values([
    {
      id: `${conversation.id}-user`,
      conversationId: conversation.id,
      role: "user",
      content: copy.chat.question,
      status: "complete",
      createdAt: askedAt,
    },
    {
      id: `${conversation.id}-assistant`,
      conversationId: conversation.id,
      role: "assistant",
      createdAt: new Date(askedAt.getTime() + 1000),
      content: copy.chat.answer,
      status: "complete",
      model: DEFAULT_CHAT_MODEL,
      toolCalls: [chartToolCall],
    },
  ]);

  return { group, conversationId: conversation.id };
}

// Relative to today, so the flows' "1 of 3 done" holds on any capture day
async function seedStoreCalendar(
  groupId: number,
  [alex, anna, tom]: [number, number, number],
  titles: (typeof STORE_COPY)[Locale]["calendar"],
) {
  const today = localDate();
  const items = await db
    .insert(calendarItems)
    .values([
      {
        groupId,
        kind: "task",
        title: titles.bins,
        color: "green",
        startsOn: today,
        recurrence: { type: "weekly", interval: 1, days: [weekdayOf(today)] },
        createdByGroupMemberId: alex,
      },
      {
        groupId,
        kind: "task",
        title: titles.bathroom,
        color: "cyan",
        startsOn: addDays(today, -14),
        recurrence: { type: "weekly", interval: 1, days: [weekdayOf(today)] },
        createdByGroupMemberId: anna,
      },
      {
        groupId,
        kind: "task",
        title: titles.plants,
        color: "yellow",
        startsOn: addDays(today, -21),
        recurrence: { type: "daily", interval: 3 },
        createdByGroupMemberId: tom,
      },
      {
        groupId,
        kind: "event",
        title: titles.dinner,
        color: "blue",
        startsOn: today,
        startTime: "19:00",
        endTime: "21:00",
        recurrence: null,
        createdByGroupMemberId: tom,
      },
      {
        groupId,
        kind: "event",
        title: titles.movies,
        color: "purple",
        startsOn: addDays(today, -12),
        startTime: "20:30",
        endTime: "23:00",
        recurrence: {
          type: "weekly",
          interval: 1,
          days: [weekdayOf(addDays(today, 2))],
        },
        createdByGroupMemberId: anna,
      },
      {
        groupId,
        kind: "event",
        title: titles.rent,
        color: "red",
        startsOn: addDays(today, -60),
        recurrence: { type: "monthly", interval: 1, on: { day: 1 } },
        createdByGroupMemberId: alex,
      },
    ])
    .returning({ id: calendarItems.id });
  const [bins, bathroom, plants] = items;
  if (!bins || !bathroom || !plants) {
    throw new Error("Failed to create seeded calendar items");
  }

  await db.insert(calendarItemMembers).values([
    ...[alex, anna, tom].map((groupMemberId, position) => ({
      itemId: bins.id,
      groupMemberId,
      position,
    })),
    { itemId: bathroom.id, groupMemberId: anna, position: 0 },
  ]);
  await db.insert(calendarOccurrences).values({
    itemId: bathroom.id,
    date: today,
    completedByGroupMemberId: anna,
    completedAt: new Date(),
  });
}

/** Same EUR scenario as debt.test.ts, so the e2e direct debts match its assertions */
async function seedDebtsScenario(groupId: number, you: number) {
  const seededUsers = await Promise.all(
    ["Lena", "Max", "Sophie"].map((name) => upsertE2EUser(name)),
  );
  const memberRows = await db
    .insert(groupMembers)
    .values(
      seededUsers.map(({ userId }): typeof groupMembers.$inferInsert => ({
        groupId,
        userId,
        role: "member",
        isActive: true,
      })),
    )
    .returning({ id: groupMembers.id });
  const [lena, max, sophie] = memberRows.map((row) => row.id);
  if (lena === undefined || max === undefined || sophie === undefined) {
    throw new Error("Failed to create seeded memberships");
  }

  const debts = [
    { debtor: max, creditor: you, cents: 4250, description: "Groceries" },
    { debtor: sophie, creditor: you, cents: 1800, description: "Pizza" },
    { debtor: you, creditor: lena, cents: 3000, description: "Internet" },
    { debtor: max, creditor: lena, cents: 2500, description: "Cleaning" },
    { debtor: sophie, creditor: max, cents: 1200, description: "Drinks" },
    { debtor: sophie, creditor: lena, cents: 800, description: "Bakery" },
    {
      debtor: you,
      creditor: max,
      cents: 1500,
      description: "Concert",
      currency: "USD",
    },
  ];
  const dayMs = 24 * 60 * 60 * 1000;
  for (const [i, debt] of debts.entries()) {
    const [expense] = await db
      .insert(expenses)
      .values({
        groupId,
        paidByGroupMemberId: debt.creditor,
        amountInCents: debt.cents,
        currency: debt.currency ?? "EUR",
        description: debt.description,
        category: "other",
        subcategory: "other",
        expenseDate: new Date(Date.now() - i * dayMs),
        createdByGroupMemberId: debt.creditor,
        splitMethod: "custom",
      })
      .returning({ id: expenses.id });
    if (!expense) throw new Error("Failed to create seeded expense");
    await db.insert(expenseSplits).values({
      expenseId: expense.id,
      groupMemberId: debt.debtor,
      amountInCents: debt.cents,
    });
  }
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
  const seed = searchParams.get("seed");
  const localeParam = searchParams.get("locale");
  const locale = localeParam && isLocale(localeParam) ? localeParam : "en";

  // Reject anything that is not a plain mailbox at the e2e domain — a
  // malformed override (e.g. a "+" decoded to a space upstream) would
  // otherwise seed a user whose email fails tRPC output validation and
  // break every screen that renders it.
  const customEmail =
    emailParam && /^[a-z0-9._-]+@flatsby\.test$/.test(emailParam)
      ? emailParam
      : undefined;

  const { userId, email } = await upsertE2EUser(name, customEmail);

  let group: { id: number };
  let conversationId: string | undefined;
  if (seed === "store") {
    const seeded = await seedStoreScenario(userId, email, locale);
    group = seeded.group;
    conversationId = seeded.conversationId;
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
    const [youMember] = await db
      .insert(groupMembers)
      .values({
        groupId: fixtureGroup.id,
        userId,
        role: "admin",
        isActive: true,
      })
      .returning({ id: groupMembers.id });
    if (seed === "debts" && youMember) {
      await seedDebtsScenario(fixtureGroup.id, youMember.id);
    }
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
    ...(conversationId ? { conversationId } : {}),
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
    await db.delete(passkeys).where(inArray(passkeys.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }

  return NextResponse.json({
    ok: true,
    deletedUsers: userIds.length,
    deletedGroups: groupIds.length,
  });
}
