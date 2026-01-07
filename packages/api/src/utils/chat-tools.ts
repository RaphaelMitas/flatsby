import type { Tool } from "ai";
import { tool, zodSchema } from "ai";
import { z } from "zod/v4";

import type { CategoryId } from "@flatsby/validators/categories";
import { and, eq } from "@flatsby/db";
import {
  groupMembers,
  shoppingListItems,
  shoppingLists,
} from "@flatsby/db/schema";
import { categoryIdSchema } from "@flatsby/validators/categories";
import type {
  AddToShoppingListResult,
  GetShoppingListsResult,
  ShoppingListInfo,
} from "@flatsby/validators/chat";

import type { createTRPCContext } from "../trpc";

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>> & {
  session: NonNullable<
    Awaited<ReturnType<typeof createTRPCContext>>["session"]
  > & {
    user: NonNullable<
      Awaited<ReturnType<typeof createTRPCContext>>["session"]
    >["user"];
  };
};

/**
 * System prompt to append when shopping list tools are enabled
 */
export const SHOPPING_LIST_SYSTEM_PROMPT = `
You have access to the user's shopping lists and can help them add items.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. NEVER make up or guess shopping list IDs or group IDs. You MUST use the exact IDs returned by getShoppingLists.
2. If you don't have the list of shopping lists yet, you MUST call getShoppingLists FIRST before adding any items.
3. WAIT for the user to select a list before calling addToShoppingList. Do NOT assume which list they want.
4. Only use IDs that appear in the getShoppingLists output. If an ID is not in that output, you cannot use it.

WORKFLOW:
1. User mentions items to add -> Call getShoppingLists with userShouldSelect=true
2. The UI will show clickable buttons for each list - DO NOT ask the user which list in your text response, the component handles it
3. User selects a list by clicking a button (you'll receive a message like "Add to the Groceries list") -> Look up the EXACT id and groupId from YOUR PREVIOUS getShoppingLists output by matching the list name
4. Call addToShoppingList with those exact IDs from step 3

WHEN TO USE userShouldSelect:
- true: When you need the user to choose a list. The UI shows clickable buttons automatically - you don't need to ask or list options in your response
- false: When you just need to check what lists exist or already know which list to use

PROACTIVE BEHAVIORS:
- User says "I need to buy milk" -> Call getShoppingLists with userShouldSelect=true (UI shows list buttons)
- User says "We're out of eggs and bread" -> Call getShoppingLists with userShouldSelect=true
- User discusses a recipe -> Offer to add ingredients, call getShoppingLists with userShouldSelect=true

AVAILABLE CATEGORIES for items:
- produce (fruits, vegetables)
- meat-seafood
- dairy (milk, cheese, eggs)
- bakery (bread, pastries)
- frozen-foods
- beverages
- snacks
- pantry (canned goods, pasta, rice)
- personal-care
- household (cleaning supplies)
- other
`;

/**
 * Creates shopping list tools for AI chat with the given context
 */
export function createShoppingListTools(
  ctx: TRPCContext,
): Record<string, Tool> {
  return {
    getShoppingLists: tool({
      description:
        "Get all shopping lists the user has access to. Use this when the user wants to add items to a shopping list but hasn't specified which one, or when you need to show available lists. Set userShouldSelect to true if you want the user to pick a list (shows clickable options), or false if you already know which list to use.",
      inputSchema: zodSchema(
        z.object({
          userShouldSelect: z
            .boolean()
            .describe(
              "Set to true to show clickable list options for user selection. Set to false if you already know which list to use or are just checking available lists.",
            ),
        }),
      ),
      execute: async ({
        userShouldSelect,
      }: {
        userShouldSelect: boolean;
      }): Promise<GetShoppingListsResult> => {
        // Get all groups the user is a member of, with their shopping lists
        const memberships = await ctx.db.query.groupMembers.findMany({
          where: eq(groupMembers.userId, ctx.session.user.id),
          with: {
            group: {
              columns: {
                id: true,
                name: true,
              },
              with: {
                shoppingLists: {
                  columns: {
                    id: true,
                    name: true,
                  },
                  with: {
                    shoppingListItems: {
                      columns: { id: true },
                      where: eq(shoppingListItems.completed, false),
                    },
                  },
                },
              },
            },
          },
        });

        // Flatten groups and their shopping lists into a single array
        const lists: ShoppingListInfo[] = [];
        for (const membership of memberships) {
          for (const list of membership.group.shoppingLists) {
            lists.push({
              id: list.id,
              name: list.name,
              groupId: membership.group.id,
              groupName: membership.group.name,
              uncheckedItemLength: list.shoppingListItems.length,
            });
          }
        }

        return {
          lists,
          userShouldSelect,
        };
      },
    }),

    addToShoppingList: tool({
      description:
        "Add one or more items to a specific shopping list. Always use getShoppingLists first if the user hasn't specified which list to use.",
      inputSchema: zodSchema(
        z.object({
          shoppingListId: z
            .number()
            .describe("The ID of the shopping list to add items to"),
          groupId: z
            .number()
            .describe("The group ID that owns the shopping list"),
          items: z
            .array(
              z.object({
                name: z
                  .string()
                  .min(1)
                  .max(256)
                  .describe("The name of the item to add"),
                categoryId: categoryIdSchema
                  .optional()
                  .describe(
                    "Category for the item. Pick the most appropriate category.",
                  ),
              }),
            )
            .min(1)
            .max(50)
            .describe("Array of items to add to the shopping list"),
        }),
      ),
      execute: async ({
        shoppingListId,
        groupId,
        items,
      }: {
        shoppingListId: number;
        groupId: number;
        items: { name: string; categoryId?: CategoryId }[];
      }): Promise<AddToShoppingListResult> => {
        // Verify user is a member of the group
        const membership = await ctx.db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, ctx.session.user.id),
          ),
        });

        if (!membership) {
          return {
            success: false,
            shoppingListName: "",
            addedItems: [],
            failedItems: items.map((item) => ({
              name: item.name,
              reason: "You are not a member of this group",
            })),
          };
        }

        // Verify shopping list exists in this group
        const list = await ctx.db.query.shoppingLists.findFirst({
          where: and(
            eq(shoppingLists.id, shoppingListId),
            eq(shoppingLists.groupId, groupId),
          ),
          columns: {
            id: true,
            name: true,
          },
        });

        if (!list) {
          return {
            success: false,
            shoppingListName: "",
            addedItems: [],
            failedItems: items.map((item) => ({
              name: item.name,
              reason: "Shopping list not found",
            })),
          };
        }

        // Add items
        const addedItems: AddToShoppingListResult["addedItems"] = [];
        const failedItems: NonNullable<AddToShoppingListResult["failedItems"]> =
          [];

        for (const item of items) {
          try {
            // Use provided category or default to "other"
            const categoryId: CategoryId = item.categoryId ?? "other";

            const [inserted] = await ctx.db
              .insert(shoppingListItems)
              .values({
                shoppingListId,
                name: item.name,
                categoryId,
                completed: false,
                createdByGroupMemberId: membership.id,
                createdAt: new Date(),
              })
              .returning({
                id: shoppingListItems.id,
              });

            if (inserted) {
              addedItems.push({
                id: inserted.id,
                name: item.name,
                categoryId,
              });
            }
          } catch (error) {
            failedItems.push({
              name: item.name,
              reason:
                error instanceof Error ? error.message : "Failed to add item",
            });
          }
        }

        return {
          success: addedItems.length > 0,
          shoppingListName: list.name,
          addedItems,
          failedItems: failedItems.length > 0 ? failedItems : undefined,
        };
      },
    }),
  };
}
