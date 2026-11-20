import { randomUUID } from "node:crypto";
import type { Locale } from "@flatsby/i18n/locale";
import type { CategoryId } from "@flatsby/validators/categories";
import { NextResponse } from "next/server";
import { and, eq, inArray, like, lt, or } from "drizzle-orm";

import { db } from "@flatsby/db/client";
import {
  accounts,
  calendarItemMembers,
  calendarItems,
  calendarOccurrences,
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
import { addDays, localDate, weekdayOf } from "@flatsby/validators/calendar";

import { auth } from "~/auth/server";
import { env } from "~/env";
import { E2E_EMAIL_DOMAIN } from "../email-domain";

const RETURNING_ACCOUNT_AGE_MS = 30 * 60 * 1000;

async function upsertE2EUser(
  name: string,
  customEmail?: string,
  returning = false,
) {
  const now = new Date();
  const createdAt = returning
    ? new Date(now.getTime() - RETURNING_ACCOUNT_AGE_MS)
    : now;
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
    await db
      .update(users)
      .set({ name, createdAt, updatedAt: now })
      .where(eq(users.id, userId));
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
      createdAt,
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

const STORE_BOUGHT = [
  ["tomatoes", "produce"],
  ["eggs", "dairy"],
  ["butter", "dairy"],
  ["pasta", "pantry"],
  ["coffee", "beverages"],
  ["bananas", "produce"],
  ["yogurt", "dairy"],
  ["rice", "pantry"],
  ["oliveOil", "pantry"],
  ["toiletPaper", "household"],
  ["dishSoap", "household"],
  ["cheese", "dairy"],
  ["onions", "produce"],
  ["orangeJuice", "beverages"],
] satisfies [keyof (typeof STORE_COPY)["en"]["bought"], CategoryId][];

const STORE_HISTORY = [
  [
    {
      key: "market",
      amountInCents: 2760,
      category: "food-drinks",
      subcategory: "groceries",
    },
    {
      key: "bulk",
      amountInCents: 6300,
      category: "food-drinks",
      subcategory: "groceries",
    },
    {
      key: "pizza",
      amountInCents: 3840,
      category: "food-drinks",
      subcategory: "restaurant",
    },
  ],
  [
    {
      key: "drugstore",
      amountInCents: 1470,
      category: "health",
      subcategory: "pharmacy",
    },
    {
      key: "coffee",
      amountInCents: 930,
      category: "food-drinks",
      subcategory: "coffee",
    },
    {
      key: "drinks",
      amountInCents: 1299,
      category: "food-drinks",
      subcategory: "bar",
    },
  ],
] satisfies {
  key: keyof (typeof STORE_COPY)["en"]["history"];
  amountInCents: number;
  category: string;
  subcategory: string;
}[][];

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
    bought: {
      tomatoes: "Tomatoes",
      eggs: "Eggs",
      butter: "Butter",
      pasta: "Pasta",
      coffee: "Coffee",
      bananas: "Bananas",
      yogurt: "Yogurt",
      rice: "Rice",
      oliveOil: "Olive Oil",
      toiletPaper: "Toilet Paper",
      dishSoap: "Dish Soap",
      cheese: "Cheese",
      onions: "Onions",
      orangeJuice: "Orange Juice",
    },
    expenses: {
      shopping: "Weekly shopping",
      internet: "Internet bill",
      cleaning: "Cleaning supplies",
    },
    history: {
      market: "Farmers market",
      bulk: "Bulk buy",
      pizza: "Pizza night",
      drugstore: "Drugstore",
      coffee: "Coffee and cake",
      drinks: "Drinks",
    },
    calendar: {
      bins: "Take out bins",
      bathroom: "Clean bathroom",
      plants: "Water the plants",
      dinner: "Flat dinner",
      movies: "Movie night",
      rent: "Rent due",
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
    bought: {
      tomatoes: "Tomaten",
      eggs: "Eier",
      butter: "Butter",
      pasta: "Nudeln",
      coffee: "Kaffee",
      bananas: "Bananen",
      yogurt: "Joghurt",
      rice: "Reis",
      oliveOil: "Olivenöl",
      toiletPaper: "Toilettenpapier",
      dishSoap: "Spülmittel",
      cheese: "Käse",
      onions: "Zwiebeln",
      orangeJuice: "Orangensaft",
    },
    expenses: {
      shopping: "Wocheneinkauf",
      internet: "Internetrechnung",
      cleaning: "Putzmittel",
    },
    history: {
      market: "Wochenmarkt",
      bulk: "Großeinkauf",
      pizza: "Pizzaabend",
      drugstore: "Drogerie",
      coffee: "Kaffee und Kuchen",
      drinks: "Getränke",
    },
    calendar: {
      bins: "Müll rausbringen",
      bathroom: "Bad putzen",
      plants: "Pflanzen gießen",
      dinner: "WG-Abendessen",
      movies: "Filmabend",
      rent: "Miete fällig",
    },
  },
} satisfies Record<Locale, unknown>;

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
  const members: [number, number, number] = [
    alexMember.id,
    annaMember.id,
    tomMember.id,
  ];

  await db.insert(shoppingListItems).values(
    [...STORE_BOUGHT, ...STORE_BOUGHT].map(([key, categoryId], i) => {
      const buyer = members[i % members.length] ?? alexMember.id;
      return {
        shoppingListId: list.id,
        name: copy.bought[key],
        categoryId,
        createdByGroupMemberId: buyer,
        completed: true,
        completedByGroupMemberId: buyer,
        completedAt: new Date(
          Date.now() - (1 + 2 * i + 3 * Math.floor(i / 8)) * dayMs,
        ),
      };
    }),
  );

  const history = [0, 1, 2, 3, 4, 5].flatMap((round) =>
    members.flatMap((paidBy, payer) => {
      const entry = STORE_HISTORY[round % 2]?.[(payer + round) % 3];
      if (!entry) return [];
      return [
        {
          ...entry,
          description: copy.history[entry.key],
          paidBy,
          expenseDate: new Date(
            Date.now() - (5 + 3 * (3 * round + payer)) * dayMs,
          ),
        },
      ];
    }),
  );

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
  for (const seed of [...seedExpenses, ...history]) {
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
    const otherMembers = members.filter((id) => id !== seed.paidBy);
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

  await seedStoreCalendar(group.id, members, copy.calendar);

  return { group };
}

const BATHROOM_WEEKS = 8;
const PLANT_TURNS = 19;

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
        startsOn: addDays(today, -7 * BATHROOM_WEEKS),
        recurrence: { type: "weekly", interval: 1, days: [weekdayOf(today)] },
        createdByGroupMemberId: anna,
      },
      {
        groupId,
        kind: "task",
        title: titles.plants,
        color: "yellow",
        startsOn: addDays(today, -3 * PLANT_TURNS),
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
  await db.insert(calendarOccurrences).values([
    ...Array.from({ length: BATHROOM_WEEKS + 1 }, (_, week) => ({
      itemId: bathroom.id,
      date: addDays(today, -7 * week),
      completedByGroupMemberId: anna,
      completedAt: new Date(),
    })),
    ...Array.from({ length: PLANT_TURNS }, (_, turn) => ({
      itemId: plants.id,
      date: addDays(today, -3 * (turn + 1)),
      completedByGroupMemberId: tom,
      completedAt: new Date(),
    })),
  ]);
}

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
  const [lenaUser, maxUser] = seededUsers;
  if (!lenaUser || !maxUser) throw new Error("Failed to create seeded users");
  await db
    .update(users)
    .set({ paypalHandle: "lenaschneider" })
    .where(eq(users.id, lenaUser.userId));
  await db
    .update(users)
    .set({ paypalHandle: "maxweber" })
    .where(eq(users.id, maxUser.userId));

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

  const customEmail =
    emailParam && /^[a-z0-9._-]+@flatsby\.test$/.test(emailParam)
      ? emailParam
      : undefined;

  const { userId, email } = await upsertE2EUser(
    name,
    customEmail,
    searchParams.has("returning"),
  );

  let group: { id: number };
  if (seed === "store") {
    const seeded = await seedStoreScenario(userId, email, locale);
    group = seeded.group;
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
