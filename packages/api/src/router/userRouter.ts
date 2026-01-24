import { Effect } from "effect";
import { z } from "zod/v4";

import { and, count, eq, inArray, isNull, ne } from "@flatsby/db";
import {
  accounts,
  chatMessages,
  conversations,
  expenses,
  groupMembers,
  groups,
  sessions,
  shoppingListItems,
  shoppingLists,
  users,
  verificationTokens,
} from "@flatsby/db/schema";
import { usageDataSchema } from "@flatsby/validators/billing";
import { groupSchema } from "@flatsby/validators/group";
import { chatModelSchema } from "@flatsby/validators/models";
import { shoppingListSchema } from "@flatsby/validators/shopping-list";
import {
  updateConsentInputSchema,
  updateUserNameFormSchema,
  userDataExportSchema,
  userSchema,
} from "@flatsby/validators/user";

import {
  Errors,
  fail,
  getApiResultZod,
  withErrorHandlingAsResult,
} from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { DbUtils, safeDbOperation } from "../utils";
import { checkCredits } from "../utils/autumn";

export const userRouter = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(({ ctx }) => {
    const user = ctx.session.user;
    return user;
  }),

  getUsage: protectedProcedure
    .output(usageDataSchema)
    .query(async ({ ctx }) => {
      try {
        const result = await checkCredits({
          authApi: ctx.authApi,
          headers: ctx.headers,
        });

        return {
          credits: {
            balance: result.balance ?? 0,
            usage: result.usage ?? 0,
          },
        };
      } catch (error) {
        console.error("Error fetching usage data:", error);
        return { credits: null };
      }
    }),

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
            groupSchema.pick({ id: true, name: true, profilePicture: true }),
          ),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      return await withErrorHandlingAsResult(
        Effect.map(
          safeDbOperation(
            () =>
              ctx.db.query.groupMembers.findMany({
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
                  },
                  user: {
                    with: {
                      lastGroupUsed: true,
                      lastShoppingListUsed: true,
                    },
                  },
                },
              }),
            "fetch user groups",
            "groupMembers",
          ),
          (groups) => {
            const user = groups[0]?.user;
            return {
              user: user
                ? {
                    ...user,
                    lastChatModelUsed: chatModelSchema.safeParse(
                      user.lastChatModelUsed,
                    ).data,
                  }
                : undefined,
              groups: groups.map((g) => g.group),
            };
          },
        ),
      );
    }),

  updateUserName: protectedProcedure
    .input(updateUserNameFormSchema)
    .output(
      getApiResultZod(
        z.object({ user: z.array(userSchema.pick({ id: true })) }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input
          input.name.trim().length > 0
            ? Effect.succeed(input.name.trim())
            : fail.validation(
                "name",
                "cannot be empty",
                "Please enter a valid name",
              ),
          (validName) =>
            // Perform the update with better error handling
            Effect.tryPromise({
              try: async () => {
                const res = await ctx.db
                  .update(users)
                  .set({ name: validName })
                  .where(eq(users.id, ctx.session.user.id))
                  .returning({ id: users.id });
                return { user: res };
              },
              catch: (error) =>
                Errors.database(
                  "update user name",
                  "users",
                  error,
                  "Unable to update your name at this time. Please try again.",
                ),
            }),
        ),
      );
    }),

  deleteUser: protectedProcedure
    .output(getApiResultZod(z.object({ success: z.boolean() })))
    .mutation(async ({ ctx }) => {
      return withErrorHandlingAsResult(
        DbUtils.transaction(async (trx) => {
          const user = ctx.session.user;

          // Clear user's last used references
          await trx
            .update(users)
            .set({ lastGroupUsed: null, lastShoppingListUsed: null })
            .where(eq(users.id, user.id));

          // Fetch all group memberships of the user, including related data
          const userGroupMemberships = await trx.query.groupMembers.findMany({
            where: eq(groupMembers.userId, user.id),
            columns: {
              id: true,
              groupId: true,
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
                    where: ne(groupMembers.userId, user.id),
                    columns: {
                      id: true,
                      userId: true,
                      role: true,
                      joinedOn: true,
                    },
                  },
                  shoppingLists: {
                    columns: {
                      id: true,
                      name: true,
                    },
                    with: {
                      shoppingListItems: {
                        columns: {
                          id: true,
                          shoppingListId: true,
                          createdByGroupMemberId: true,
                          completedByGroupMemberId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          // Process each group membership
          for (const membership of userGroupMemberships) {
            const { id: groupMemberId, groupId, role, group } = membership;
            const isAdmin = role === "admin";

            const otherMembers = group.groupMembers;
            const otherAdmins = otherMembers.filter(
              (member) => member.role === "admin",
            );

            if (otherMembers.length > 0) {
              // Set `createdByGroupMemberId` and `completedByGroupMemberId` to null
              const affectedShoppingListItemIds = group.shoppingLists
                .flatMap((list) => list.shoppingListItems)
                .filter(
                  (item) =>
                    item.createdByGroupMemberId === groupMemberId ||
                    item.completedByGroupMemberId === groupMemberId,
                )
                .map((item) => item.id);

              if (affectedShoppingListItemIds.length > 0) {
                await trx
                  .update(shoppingListItems)
                  .set({ createdByGroupMemberId: null })
                  .where(
                    and(
                      inArray(
                        shoppingListItems.id,
                        affectedShoppingListItemIds,
                      ),
                      eq(
                        shoppingListItems.createdByGroupMemberId,
                        groupMemberId,
                      ),
                    ),
                  );

                await trx
                  .update(shoppingListItems)
                  .set({ completedByGroupMemberId: null })
                  .where(
                    and(
                      inArray(
                        shoppingListItems.id,
                        affectedShoppingListItemIds,
                      ),
                      eq(
                        shoppingListItems.completedByGroupMemberId,
                        groupMemberId,
                      ),
                    ),
                  );
              }
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
                // Delete all entries related to the group

                // Collect all shopping list item IDs
                const shoppingListItemIds = group.shoppingLists
                  .flatMap((list) => list.shoppingListItems)
                  .map((item) => item.id);

                if (shoppingListItemIds.length > 0) {
                  // Delete shopping list items
                  await trx
                    .delete(shoppingListItems)
                    .where(inArray(shoppingListItems.id, shoppingListItemIds));
                }

                // Collect all shopping list IDs
                const shoppingListIds = group.shoppingLists.map(
                  (list) => list.id,
                );

                if (shoppingListIds.length > 0) {
                  // Delete shopping lists
                  await trx
                    .delete(shoppingLists)
                    .where(inArray(shoppingLists.id, shoppingListIds));
                }

                // Delete group memberships
                await trx
                  .delete(groupMembers)
                  .where(eq(groupMembers.groupId, groupId));

                // Delete the group
                await trx.delete(groups).where(eq(groups.id, groupId));
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
          await trx.delete(sessions).where(eq(sessions.userId, user.id));
          await trx.delete(users).where(eq(users.id, user.id));

          return { success: true };
        }, "delete user and cleanup related data")(ctx.db),
      );
    }),

  updateConsent: protectedProcedure
    .input(updateConsentInputSchema)
    .output(getApiResultZod(z.object({ success: z.boolean() })))
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.tryPromise({
          try: async () => {
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

            await ctx.db
              .update(users)
              .set(updateData)
              .where(eq(users.id, ctx.session.user.id));

            return { success: true };
          },
          catch: (error) =>
            Errors.database(
              "update consent",
              "users",
              error,
              "Unable to update consent at this time. Please try again.",
            ),
        }),
      );
    }),

  exportUserData: protectedProcedure
    .output(getApiResultZod(userDataExportSchema))
    .query(async ({ ctx }) => {
      return withErrorHandlingAsResult(
        Effect.tryPromise({
          try: async () => {
            const userId = ctx.session.user.id;

            // Fetch user data
            const user = await ctx.db.query.users.findFirst({
              where: eq(users.id, userId),
              columns: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                termsAcceptedAt: true,
                termsVersion: true,
                privacyAcceptedAt: true,
                privacyVersion: true,
              },
            });

            if (!user) {
              throw new Error("User not found");
            }

            // Fetch user's groups with membership info
            const userGroups = await ctx.db.query.groupMembers.findMany({
              where: eq(groupMembers.userId, userId),
              columns: {
                role: true,
                joinedOn: true,
              },
              with: {
                group: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
            });

            // Get group IDs the user belongs to
            const groupIds = userGroups.map((g) => g.group.id);

            // Fetch shopping lists from user's groups
            const userShoppingLists =
              groupIds.length > 0
                ? await ctx.db.query.shoppingLists.findMany({
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
                        },
                      },
                    },
                  })
                : [];

            // Fetch user's expenses (where they are the payer or creator)
            const userGroupMemberIds = await ctx.db.query.groupMembers.findMany(
              {
                where: eq(groupMembers.userId, userId),
                columns: {
                  id: true,
                },
              },
            );
            const memberIds = userGroupMemberIds.map((m) => m.id);

            const userExpenses =
              memberIds.length > 0
                ? await ctx.db.query.expenses.findMany({
                    where: inArray(expenses.paidByGroupMemberId, memberIds),
                    columns: {
                      id: true,
                      description: true,
                      amountInCents: true,
                      currency: true,
                      expenseDate: true,
                      groupId: true,
                    },
                  })
                : [];

            // Fetch user's conversations with message counts
            const userConversations = await ctx.db
              .select({
                id: conversations.id,
                title: conversations.title,
                createdAt: conversations.createdAt,
                messageCount: count(chatMessages.id),
              })
              .from(conversations)
              .leftJoin(
                chatMessages,
                eq(chatMessages.conversationId, conversations.id),
              )
              .where(
                and(
                  eq(conversations.userId, userId),
                  isNull(conversations.deletedAt),
                ),
              )
              .groupBy(conversations.id);

            return {
              exportedAt: new Date().toISOString(),
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt.toISOString(),
                termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
                termsVersion: user.termsVersion ?? null,
                privacyAcceptedAt:
                  user.privacyAcceptedAt?.toISOString() ?? null,
                privacyVersion: user.privacyVersion ?? null,
              },
              groups: userGroups.map((g) => ({
                id: g.group.id,
                name: g.group.name,
                role: g.role,
                joinedOn: g.joinedOn.toISOString(),
              })),
              shoppingLists: userShoppingLists.map((sl) => ({
                id: sl.id,
                name: sl.name,
                groupId: sl.groupId,
                itemsCount: sl.shoppingListItems.length,
              })),
              expenses: userExpenses.map((e) => ({
                id: e.id,
                description: e.description,
                amountInCents: e.amountInCents,
                currency: e.currency,
                expenseDate: e.expenseDate.toISOString(),
                groupId: e.groupId,
              })),
              conversations: userConversations.map((c) => ({
                id: c.id,
                title: c.title,
                createdAt: c.createdAt.toISOString(),
                messageCount: c.messageCount,
              })),
            };
          },
          catch: (error) =>
            Errors.database(
              "export user data",
              "users",
              error,
              "Unable to export your data at this time. Please try again.",
            ),
        }),
      );
    }),
});
