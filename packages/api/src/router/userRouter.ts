import { Effect } from "effect";
import { z } from "zod/v4";

import { and, eq, inArray, isNotNull, ne, or } from "@flatsby/db";
import {
  accounts,
  analyticsConsents,
  creditBalances,
  expenses,
  expenseSplits,
  groupMembers,
  passkeys,
  sessions,
  shoppingLists,
  users,
  verificationTokens,
} from "@flatsby/db/schema";
import {
  subscriptionDataSchema,
  usageDataSchema,
} from "@flatsby/validators/billing";
import { groupSchema, hasJoined } from "@flatsby/validators/group";
import { paypalHandleInputSchema } from "@flatsby/validators/payment";
import { shoppingListSchema } from "@flatsby/validators/shopping-list";
import {
  logAnalyticsConsentInputSchema,
  setAnalyticsOptOutInputSchema,
  updateConsentInputSchema,
  updateUserNameFormSchema,
  userDataExportSchema,
  userSchema,
} from "@flatsby/validators/user";

import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import { Errors, getApiResultZod } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { GroupUtils, memberName } from "../utils";
import { getCreditUsage } from "../utils/credits";

// Released iOS builds open the paywall for "free"; any other id sends them to a harmless screen
const includedPlan = {
  planId: "included",
  // i18n-ignore
  planName: "Free",
};

export const userRouter = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(({ ctx }) => {
    const user = ctx.session.user;
    return user;
  }),

  getUsage: protectedProcedure
    .output(usageDataSchema)
    .query(async ({ ctx }) => {
      const { balance, usage } = await getCreditUsage(ctx.session.user.id);
      // Released builds show a bundled upgrade card at 0; a capped scan still fails with the server's message
      return { credits: { balance: Math.max(balance, 1), usage } };
    }),

  getSubscription: protectedProcedure
    .output(subscriptionDataSchema)
    .query(() => includedPlan),

  getCurrentUserWithGroups: protectedProcedure
    .output(
      getApiResultZod(
        z.object({
          user: userSchema
            .extend({
              lastGroupUsed: groupSchema.nullable(),
              lastShoppingListUsed: shoppingListSchema.nullable(),
            })
            .optional(),
          groups: z.array(
            groupSchema
              .pick({ id: true, name: true, profilePicture: true })
              .extend({ memberCount: z.number() }),
          ),
        }),
      ),
    )
    .query(async ({ ctx }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          const groups = yield* database.query(
            "fetch user groups on groupMembers",
            (db) =>
              db.query.groupMembers.findMany({
                columns: {},
                where: and(
                  eq(groupMembers.userId, ctx.session.user.id),
                  eq(groupMembers.isActive, true),
                ),
                with: {
                  group: {
                    columns: {
                      id: true,
                      name: true,
                      profilePicture: true,
                    },
                    with: {
                      groupMembers: {
                        columns: { userId: true },
                        where: (members, { eq }) => eq(members.isActive, true),
                      },
                    },
                  },
                  user: {
                    with: {
                      lastGroupUsed: true,
                      lastShoppingListUsed: true,
                    },
                  },
                },
              }),
          );
          const user = groups[0]?.user;
          // Leaving a group keeps these ids, and old rows were written unchecked
          const activeGroupIds = new Set(groups.map(({ group }) => group.id));
          return {
            user: user
              ? {
                  ...user,
                  lastGroupUsed:
                    user.lastGroupUsed !== null &&
                    activeGroupIds.has(user.lastGroupUsed.id)
                      ? user.lastGroupUsed
                      : null,
                  lastShoppingListUsed:
                    user.lastShoppingListUsed !== null &&
                    activeGroupIds.has(user.lastShoppingListUsed.groupId)
                      ? user.lastShoppingListUsed
                      : null,
                }
              : undefined,
            groups: groups.map(
              ({ group: { groupMembers: members, ...group } }) => ({
                ...group,
                memberCount: members.filter(hasJoined).length,
              }),
            ),
          };
        }),
      ),
    ),

  updateUserName: protectedProcedure
    .input(updateUserNameFormSchema)
    .output(
      getApiResultZod(
        z.object({ user: z.array(userSchema.pick({ id: true })) }),
      ),
    )
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const name = input.name.trim();
          if (name.length === 0) {
            return yield* Errors.validation("errors.invalidName");
          }
          const database = yield* Database;
          const user = yield* database.query(
            "update user name",
            (db) =>
              db
                .update(users)
                .set({ name })
                .where(eq(users.id, ctx.session.user.id))
                .returning({ id: users.id }),
            { messageKey: "errors.updateNameFailed", table: "users" },
          );
          return { user };
        }),
      ),
    ),

  updatePaypalHandle: protectedProcedure
    .input(paypalHandleInputSchema)
    .output(getApiResultZod(z.string().nullable()))
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const paypalHandle = input.paypalHandle || null;
          const database = yield* Database;
          yield* database.query(
            "update paypal handle",
            (db) =>
              db
                .update(users)
                .set({ paypalHandle })
                .where(eq(users.id, ctx.session.user.id)),
            { messageKey: "errors.updatePaypalHandleFailed", table: "users" },
          );
          return paypalHandle;
        }),
      ),
    ),

  deleteUser: protectedProcedure
    .output(getApiResultZod(z.object({ success: z.boolean() })))
    .mutation(async ({ ctx }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          return yield* database.query(
            "transaction: delete user and cleanup related data",
            (db) =>
              db.transaction(async (trx) => {
                const user = ctx.session.user;

                // Lock groups before updating users, the order deleteGroup uses, so the two can't deadlock
                const userGroups = await trx
                  .selectDistinct({ groupId: groupMembers.groupId })
                  .from(groupMembers)
                  .where(eq(groupMembers.userId, user.id))
                  .orderBy(groupMembers.groupId);
                for (const { groupId } of userGroups) {
                  await GroupUtils.lockGroup(trx, groupId);
                }

                // Clear user's last used references
                await trx
                  .update(users)
                  .set({ lastGroupUsed: null, lastShoppingListUsed: null })
                  .where(eq(users.id, user.id));

                // Fetch all group memberships of the user, including related data
                const userGroupMemberships =
                  await trx.query.groupMembers.findMany({
                    where: eq(groupMembers.userId, user.id),
                    columns: {
                      id: true,
                      groupId: true,
                      role: true,
                      joinedOn: true,
                    },
                    with: {
                      group: {
                        columns: { id: true },
                        with: {
                          groupMembers: {
                            // Placeholders can't take over a group, so only people count as others
                            where: and(
                              isNotNull(groupMembers.userId),
                              ne(groupMembers.userId, user.id),
                            ),
                            columns: {
                              id: true,
                              role: true,
                              joinedOn: true,
                            },
                          },
                        },
                      },
                    },
                  });

                // Process each group membership
                for (const membership of userGroupMemberships) {
                  const {
                    id: groupMemberId,
                    groupId,
                    role,
                    group,
                  } = membership;
                  const isAdmin = role === "admin";

                  const otherMembers = group.groupMembers;
                  const otherAdmins = otherMembers.filter(
                    (member) => member.role === "admin",
                  );

                  if (otherMembers.length > 0) {
                    await GroupUtils.detachMemberFromItems(trx, groupMemberId);
                  }
                  if (isAdmin) {
                    if (otherAdmins.length > 0) {
                      // There are other admins, so we can safely remove the user
                      // Remove the user's membership
                      await trx
                        .delete(groupMembers)
                        .where(eq(groupMembers.id, groupMemberId));
                    } else if (otherMembers.length > 0) {
                      // The user is the last admin but there are other members
                      // Promote the member who joined first to admin
                      const sortedMembers = otherMembers.sort((a, b) =>
                        a.joinedOn < b.joinedOn ? -1 : 1,
                      );
                      const newAdmin = sortedMembers[0];

                      if (newAdmin?.id === undefined) {
                        throw new Error("Couldn't find a new admin");
                      }
                      await trx
                        .update(groupMembers)
                        .set({ role: "admin" })
                        .where(eq(groupMembers.id, newAdmin.id));

                      await trx
                        .delete(groupMembers)
                        .where(eq(groupMembers.id, groupMemberId));
                    } else {
                      // The user is the last member and admin
                      await GroupUtils.deleteGroupData(trx, groupId);
                    }
                  } else {
                    // The user is not an admin, simply remove their membership
                    await trx
                      .delete(groupMembers)
                      .where(eq(groupMembers.id, groupMemberId));
                  }
                }

                // Finally, delete the user
                if (user.email)
                  await trx
                    .delete(verificationTokens)
                    .where(eq(verificationTokens.identifier, user.email));
                await trx.delete(accounts).where(eq(accounts.userId, user.id));
                await trx.delete(passkeys).where(eq(passkeys.userId, user.id));
                await trx.delete(sessions).where(eq(sessions.userId, user.id));
                await trx.delete(users).where(eq(users.id, user.id));

                return { success: true };
              }),
          );
        }),
      ),
    ),

  updateConsent: protectedProcedure
    .input(updateConsentInputSchema)
    .output(getApiResultZod(z.object({ success: z.boolean() })))
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          return yield* database.query(
            "update consent",
            async (db) => {
              const now = new Date();
              const updateData: Record<string, unknown> = {};

              if (input.termsAccepted) {
                updateData.termsAcceptedAt = now;
                updateData.termsVersion = input.version;
              }
              if (input.privacyAccepted) {
                updateData.privacyAcceptedAt = now;
                updateData.privacyVersion = input.version;
              }

              await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, ctx.session.user.id));

              return { success: true };
            },
            { messageKey: "errors.updateConsentFailed", table: "users" },
          );
        }),
      ),
    ),

  setAnalyticsOptOut: protectedProcedure
    .input(setAnalyticsOptOutInputSchema)
    .output(getApiResultZod(z.object({ success: z.boolean() })))
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          return yield* database.query(
            "set analytics opt-out",
            async (db) => {
              await db
                .update(users)
                .set({ analyticsOptOut: input.optOut })
                .where(eq(users.id, ctx.session.user.id));
              return { success: true };
            },
            { messageKey: "errors.updateAnalyticsFailed", table: "users" },
          );
        }),
      ),
    ),

  logAnalyticsConsent: protectedProcedure
    .input(logAnalyticsConsentInputSchema)
    .output(getApiResultZod(z.object({ success: z.boolean() })))
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          return yield* database.query(
            "log analytics consent",
            async (db) => {
              await db
                .insert(analyticsConsents)
                .values({ ...input, userId: ctx.session.user.id });
              return { success: true };
            },
            {
              messageKey: "errors.updateAnalyticsFailed",
              table: "analytics_consent",
            },
          );
        }),
      ),
    ),

  exportUserData: protectedProcedure
    .output(getApiResultZod(userDataExportSchema))
    .query(async ({ ctx }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          return yield* database.query(
            "export user data",
            async (db) => {
              const userId = ctx.session.user.id;

              const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  createdAt: true,
                  termsAcceptedAt: true,
                  termsVersion: true,
                  privacyAcceptedAt: true,
                  privacyVersion: true,
                  analyticsOptOut: true,
                  paypalHandle: true,
                },
              });

              if (!user) {
                throw new Error("User not found");
              }

              const signInMethods = await db.query.accounts.findMany({
                where: eq(accounts.userId, userId),
                columns: { providerId: true, accountId: true, createdAt: true },
              });

              const userPasskeys = await db.query.passkeys.findMany({
                where: eq(passkeys.userId, userId),
                columns: { name: true, createdAt: true, backedUp: true },
              });

              const analyticsConsentLog =
                await db.query.analyticsConsents.findMany({
                  where: eq(analyticsConsents.userId, userId),
                  columns: {
                    screens: true,
                    recordings: true,
                    version: true,
                    platform: true,
                    createdAt: true,
                  },
                });

              const aiUsage = await db.query.creditBalances.findMany({
                where: eq(creditBalances.userId, userId),
                columns: { monthStart: true, used: true },
              });

              const userSessions = await db.query.sessions.findMany({
                where: eq(sessions.userId, userId),
                columns: {
                  createdAt: true,
                  expiresAt: true,
                  ipAddress: true,
                  userAgent: true,
                },
              });

              // Removed or departed members keep an inactive row; they must not export that household.
              const userGroups = await db.query.groupMembers.findMany({
                where: and(
                  eq(groupMembers.userId, userId),
                  eq(groupMembers.isActive, true),
                ),
                columns: {
                  id: true,
                  role: true,
                  joinedOn: true,
                },
                with: {
                  group: {
                    columns: {
                      id: true,
                      name: true,
                    },
                    with: {
                      groupMembers: {
                        columns: {
                          id: true,
                          placeholderName: true,
                          isActive: true,
                        },
                        with: { user: { columns: { name: true } } },
                      },
                    },
                  },
                },
              });

              const groupIds = userGroups.map((g) => g.group.id);
              const memberIds = userGroups.map((g) => g.id);

              const userShoppingLists =
                groupIds.length > 0
                  ? await db.query.shoppingLists.findMany({
                      where: inArray(shoppingLists.groupId, groupIds),
                      columns: {
                        id: true,
                        name: true,
                        groupId: true,
                      },
                      with: {
                        shoppingListItems: {
                          columns: {
                            id: true,
                            name: true,
                            categoryId: true,
                            completed: true,
                            createdAt: true,
                            completedAt: true,
                            createdByGroupMemberId: true,
                            completedByGroupMemberId: true,
                          },
                        },
                      },
                    })
                  : [];

              // Settlements are expenses too, so this also covers them.
              const userExpenses =
                memberIds.length > 0
                  ? await db.query.expenses.findMany({
                      where: or(
                        inArray(expenses.paidByGroupMemberId, memberIds),
                        inArray(expenses.createdByGroupMemberId, memberIds),
                        inArray(
                          expenses.id,
                          db
                            .select({ id: expenseSplits.expenseId })
                            .from(expenseSplits)
                            .where(
                              inArray(expenseSplits.groupMemberId, memberIds),
                            ),
                        ),
                      ),
                      columns: {
                        id: true,
                        groupId: true,
                        description: true,
                        amountInCents: true,
                        currency: true,
                        convertedAmountInCents: true,
                        convertedCurrency: true,
                        category: true,
                        subcategory: true,
                        splitMethod: true,
                        expenseDate: true,
                        paidByGroupMemberId: true,
                        createdByGroupMemberId: true,
                      },
                      with: {
                        expenseSplits: {
                          columns: {
                            groupMemberId: true,
                            amountInCents: true,
                            percentage: true,
                            shares: true,
                          },
                        },
                      },
                    })
                  : [];

              return {
                exportedAt: new Date(),
                user,
                signInMethods,
                passkeys: userPasskeys,
                analyticsConsents: analyticsConsentLog,
                aiUsage,
                sessions: userSessions,
                groups: userGroups.map((g) => ({
                  id: g.group.id,
                  name: g.group.name,
                  memberId: g.id,
                  role: g.role,
                  joinedOn: g.joinedOn,
                  members: g.group.groupMembers.map((m) => ({
                    memberId: m.id,
                    name: memberName(m),
                    active: m.isActive,
                  })),
                })),
                shoppingLists: userShoppingLists.map((sl) => ({
                  id: sl.id,
                  name: sl.name,
                  groupId: sl.groupId,
                  items: sl.shoppingListItems,
                })),
                expenses: userExpenses.map(({ expenseSplits, ...expense }) => ({
                  ...expense,
                  splits: expenseSplits,
                })),
              };
            },
            { messageKey: "errors.exportDataFailed", table: "users" },
          );
        }),
      ),
    ),
});
