import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import { Effect } from "effect";
import { z } from "zod/v4";

import { and, count, desc, eq, ilike, sql } from "@flatsby/db";
import {
  groups,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import { messages } from "@flatsby/i18n/messages";
import {
  categoryCountsSchema,
  categoryIds,
  categoryIdSchema,
  isCategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import {
  createShoppingListItemSchema,
  createShoppingListSchema,
  deleteShoppingListItemSchema,
  deleteShoppingListSchema,
  shoppingListItemSchema,
  suggestItemsOutputSchema,
  suggestItemsSchema,
  updateShoppingListItemSchema,
  updateShoppingListSchema,
} from "@flatsby/validators/shopping-list";

import type { CreditUser } from "../utils/autumn";
import { requireMember } from "../effect/groups";
import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import {
  firstReturned,
  getListInGroupWithAccess,
  getListWithAccess,
  getShoppingListItemWithAccess,
  setLastUsed,
} from "../effect/shoppingLists";
import { Errors, getApiResultZod } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ValidationUtils } from "../utils";
import { classify } from "../utils/classify";

export const shoppingList = createTRPCRouter({
  getShoppingListName: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
      }),
    )
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const { list } = yield* getListInGroupWithAccess(
            input.groupId,
            input.shoppingListId,
          );
          return list.name;
        }),
      ),
    ),

  getShoppingLists: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
      }),
    )
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireMember(input.groupId);
          const database = yield* Database;
          const group = yield* database.findOneOrFail("group", (db) =>
            db.query.groups.findFirst({
              where: eq(groups.id, input.groupId),
              columns: {
                id: true,
              },
              with: {
                shoppingLists: {
                  columns: {
                    id: true,
                    name: true,
                    icon: true,
                    description: true,
                  },
                  with: {
                    shoppingListItems: {
                      columns: {
                        completed: true,
                      },
                      where: eq(shoppingListItems.completed, false),
                    },
                  },
                },
              },
            }),
          );
          return group.shoppingLists.map((list) => ({
            id: list.id,
            name: list.name,
            description: list.description,
            icon: list.icon,
            uncheckedItemLength: list.shoppingListItems.length,
          }));
        }),
      ),
    ),

  createShoppingList: protectedProcedure
    .input(createShoppingListSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const name = yield* ValidationUtils.notEmpty(
            input.name,
            "shoppingListName",
          );
          yield* requireMember(input.groupId);
          const database = yield* Database;
          const created = yield* database.query("create shopping list", (db) =>
            db
              .insert(shoppingLists)
              .values({
                groupId: input.groupId,
                name,
                icon: input.icon,
                description: input.description,
              })
              .returning({ id: shoppingLists.id }),
          );
          const { id } = yield* firstReturned(created);
          return { shoppingListId: id };
        }),
      ),
    ),

  getShoppingList: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
      }),
    )
    .output(
      getApiResultZod(
        z.object({
          shoppingList: z.object({
            id: z.number(),
            groupId: z.number(),
            name: z.string().min(1, "Shopping list name cannot be empty"),
            icon: z.string().nullable(),
            description: z.string().nullable(),
            createdAt: z.date(),
            group: z.object({
              id: z.number(),
              groupMembers: z.array(
                z.object({
                  id: z.number(),
                  user: z.object({
                    email: z.string().email(),
                    name: z.string().min(1, "User name cannot be empty"),
                    image: z.string().nullable(),
                  }),
                }),
              ),
            }),
          }),
          currentMember: z.object({
            id: z.number(),
            groupId: z.number(),
            userId: z.string(),
            role: z.string(),
            joinedOn: z.date(),
            user: z.object({
              email: z.string().email(),
              name: z.string().min(1, "User name cannot be empty"),
              image: z.string().nullable(),
            }),
          }),
        }),
      ),
    )
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const member = yield* requireMember(input.groupId);
          const database = yield* Database;
          const shoppingList = yield* database.findOneOrFail(
            "shoppingList",
            (db) =>
              db.query.shoppingLists.findFirst({
                where: and(
                  eq(shoppingLists.id, input.shoppingListId),
                  eq(shoppingLists.groupId, input.groupId),
                ),
                with: {
                  group: {
                    columns: {
                      id: true,
                    },
                    with: {
                      groupMembers: {
                        where: (members, { eq }) => eq(members.isActive, true),
                        columns: {
                          id: true,
                        },
                        with: {
                          user: {
                            columns: {
                              email: true,
                              name: true,
                              image: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              }),
          );
          const self = shoppingList.group.groupMembers.find(
            (groupMember) => groupMember.id === member.id,
          );
          if (!self) return yield* Errors.notFound("groupMembership");
          return {
            shoppingList,
            currentMember: { ...member, user: self.user },
          };
        }),
      ),
    ),

  deleteShoppingList: protectedProcedure
    .input(deleteShoppingListSchema)
    .output(getApiResultZod(z.object({ success: z.boolean() })))
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* getListInGroupWithAccess(input.groupId, input.shoppingListId);
          const database = yield* Database;
          return yield* database.query(
            "transaction: delete shopping list and all items",
            (db) =>
              db.transaction(async (trx) => {
                await trx
                  .update(users)
                  .set({ lastShoppingListUsed: null })
                  .where(eq(users.lastShoppingListUsed, input.shoppingListId));
                await trx
                  .delete(shoppingListItems)
                  .where(
                    eq(shoppingListItems.shoppingListId, input.shoppingListId),
                  );
                await trx
                  .delete(shoppingLists)
                  .where(eq(shoppingLists.id, input.shoppingListId));
                return { success: true };
              }),
          );
        }),
      ),
    ),

  changeShoppingListName: protectedProcedure
    .input(updateShoppingListSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const name = yield* ValidationUtils.notEmpty(
            input.name,
            "shoppingListName",
          );
          yield* getListWithAccess(input.shoppingListId);
          const database = yield* Database;
          const updated = yield* database.query(
            "update shopping list name",
            (db) =>
              db
                .update(shoppingLists)
                .set({ name })
                .where(eq(shoppingLists.id, input.shoppingListId))
                .returning({ id: shoppingLists.id }),
          );
          const { id } = yield* firstReturned(updated);
          return { shoppingListId: id };
        }),
      ),
    ),

  getShoppingListItems: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
        categoryId: categoryIdSchema.optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.number().min(0).default(0),
      }),
    )
    .output(
      getApiResultZod(
        z.object({
          items: z.array(shoppingListItemSchema),
          nextCursor: z.number().optional(),
        }),
      ),
    )
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* getListInGroupWithAccess(input.groupId, input.shoppingListId);
          const database = yield* Database;
          const items = yield* database.query(
            "fetch shopping list items",
            (db) =>
              db.query.shoppingListItems.findMany({
                where: and(
                  eq(shoppingListItems.shoppingListId, input.shoppingListId),
                  input.categoryId
                    ? eq(shoppingListItems.categoryId, input.categoryId)
                    : undefined,
                ),
                columns: {
                  id: true,
                  name: true,
                  completed: true,
                  createdAt: true,
                  categoryId: true,
                  completedAt: true,
                  completedByGroupMemberId: true,
                  createdByGroupMemberId: true,
                },
                orderBy: (item, { desc }) => [
                  desc(item.completedAt),
                  desc(item.createdAt),
                ],
                limit: input.limit + 1,
                offset: input.cursor,
              }),
          );

          let nextCursor: number | undefined;
          if (items.length > input.limit) {
            items.pop();
            nextCursor = input.cursor + input.limit;
          }

          return {
            items: items.map((item) => ({
              ...item,
              categoryId: isCategoryIdWithAiAutoSelect(item.categoryId)
                ? item.categoryId
                : "other",
            })),
            nextCursor,
          };
        }),
      ),
    ),

  getCategoryCounts: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
      }),
    )
    .output(getApiResultZod(categoryCountsSchema))
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* getListInGroupWithAccess(input.groupId, input.shoppingListId);
          const database = yield* Database;
          const rows = yield* database.query("get category counts", (db) =>
            db
              .select({
                categoryId: shoppingListItems.categoryId,
                count: count(shoppingListItems.id),
              })
              .from(shoppingListItems)
              .where(
                and(
                  eq(shoppingListItems.shoppingListId, input.shoppingListId),
                  eq(shoppingListItems.completed, false),
                ),
              )
              .groupBy(shoppingListItems.categoryId),
          );

          const counts: Record<string, number> = {};
          let total = 0;
          for (const row of rows) {
            counts[row.categoryId] = row.count;
            total += row.count;
          }
          return { counts, total };
        }),
      ),
    ),

  createShoppingListItem: protectedProcedure
    .input(createShoppingListItemSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const name = yield* ValidationUtils.notEmpty(
            input.name,
            "shoppingListItemName",
          );
          const { member } = yield* getListInGroupWithAccess(
            input.groupId,
            input.shoppingListId,
          );
          const categoryId = yield* categoryFor(
            ctx.session.user,
            input.categoryId,
            name,
          );
          const database = yield* Database;
          const created = yield* database.query(
            "create shopping list item",
            (db) =>
              db
                .insert(shoppingListItems)
                .values({
                  shoppingListId: input.shoppingListId,
                  name,
                  categoryId,
                  completed: false,
                  createdByGroupMemberId: member.id,
                  createdAt: new Date(),
                })
                .returning({ id: shoppingListItems.id }),
          );
          const { id } = yield* firstReturned(created);
          return id;
        }),
      ),
    ),

  updateShoppingListItem: protectedProcedure
    .input(updateShoppingListItemSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const name = yield* ValidationUtils.notEmpty(
            input.name,
            "shoppingListItemName",
          );
          const { item, member } = yield* getShoppingListItemWithAccess(
            input.id,
          );
          const categoryId = yield* categoryFor(
            ctx.session.user,
            input.categoryId,
            name,
          );

          const updateData: Partial<typeof shoppingListItems.$inferInsert> = {
            name,
            categoryId,
            completed: input.completed,
          };
          if (item.completed !== input.completed) {
            updateData.completedByGroupMemberId = input.completed
              ? member.id
              : null;
            updateData.completedAt = input.completed ? new Date() : null;
          }

          const database = yield* Database;
          const updated = yield* database.query(
            "update shopping list item",
            (db) =>
              db
                .update(shoppingListItems)
                .set(updateData)
                .where(eq(shoppingListItems.id, input.id))
                .returning({ id: shoppingListItems.id }),
          );
          const { id } = yield* firstReturned(updated);
          return id;
        }),
      ),
    ),

  deleteShoppingListItem: protectedProcedure
    .input(deleteShoppingListItemSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* getShoppingListItemWithAccess(input.id);
          const database = yield* Database;
          const deleted = yield* database.query(
            "delete shopping list item",
            (db) =>
              db
                .delete(shoppingListItems)
                .where(eq(shoppingListItems.id, input.id))
                .returning({ id: shoppingListItems.id }),
          );
          const { id } = yield* firstReturned(deleted);
          return id;
        }),
      ),
    ),

  updateLastUsed: protectedProcedure
    .input(
      z.object({
        groupId: z.number().nullable(),
        shoppingListId: z.number().nullable(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runResult(ctx, setLastUsed(input.groupId, input.shoppingListId)),
    ),

  suggestItems: protectedProcedure
    .input(suggestItemsSchema)
    .output(getApiResultZod(z.array(suggestItemsOutputSchema)))
    .query(({ ctx, input }) => {
      const escaped = input.query.replace(/%/g, "\\%").replace(/_/g, "\\_");
      return runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireMember(input.groupId);
          const database = yield* Database;
          return yield* database.query("suggest items", (db) =>
            db
              .select({
                name: sql<string>`min(${shoppingListItems.name})`,
                frequency: count(shoppingListItems.id),
                categoryId: sql<CategoryId>`mode() WITHIN GROUP (ORDER BY ${shoppingListItems.categoryId})`,
              })
              .from(shoppingListItems)
              .innerJoin(
                shoppingLists,
                eq(shoppingListItems.shoppingListId, shoppingLists.id),
              )
              .where(
                and(
                  eq(shoppingLists.groupId, input.groupId),
                  ilike(shoppingListItems.name, `%${escaped}%`),
                ),
              )
              .groupBy(sql`lower(${shoppingListItems.name})`)
              .orderBy(desc(count(shoppingListItems.id)))
              .limit(8),
          );
        }),
      );
    }),
});

const { names, descriptions } = messages.en.shoppingCategories;
const itemCategoryOptions = categoryIds.map((id) => ({
  id,
  description: `${names[id]}: ${descriptions[id]}`,
}));

const categoryFor = (
  user: CreditUser,
  categoryId: CategoryIdWithAiAutoSelect,
  itemName: string,
) =>
  categoryId === "ai-auto-select"
    ? Effect.promise(() =>
        classify({
          user,
          feature: "categorize-item",
          instructions:
            "Which grocery category does this shopping list item belong to?", // i18n-ignore: model prompt
          options: itemCategoryOptions,
          input: itemName,
          fallback: "other",
        }),
      )
    : Effect.succeed(categoryId);
