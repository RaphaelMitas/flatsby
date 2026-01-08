import type { CategoryId } from "@flatsby/validators/categories";
import type {
  AddExpenseResult,
  AddToShoppingListResult,
  GetDebtsResult,
  GetExpensesResult,
  GetGroupMembersResult,
  GetShoppingListItemsResult,
  GetShoppingListsResult,
  MarkItemCompleteResult,
  RemoveItemResult,
  ShoppingListInfo,
} from "@flatsby/validators/chat/tools";
import type { Tool } from "ai";
import { tool, zodSchema } from "ai";
import { z } from "zod/v4";

import { and, asc, desc, eq, ilike } from "@flatsby/db";
import {
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
} from "@flatsby/db/schema";
import { categoryIdSchema } from "@flatsby/validators/categories";
import { calculateDebts } from "@flatsby/validators/expenses/debt";
import { distributeEqualAmounts } from "@flatsby/validators/expenses/distribution";

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
 * System prompt sections for each tool category
 */
const SHOPPING_LIST_PROMPT = `SHOPPING LIST TOOLS:
- getShoppingLists: Get all shopping lists. Set userShouldSelect=true to show clickable buttons.
- addToShoppingList: Add items to a list. Use IDs from getShoppingLists.
- getShoppingListItems: View items in a list.
- markItemComplete: Check off or uncheck an item by name.
- removeItem: Remove an item by name.

SHOPPING LIST RULES:
- Always call getShoppingLists first to get list IDs before other operations.
- Item names are matched case-insensitively.

CATEGORIES for shopping items:
produce, meat-seafood, dairy, bakery, frozen-foods, beverages, snacks, pantry, personal-care, household, other`;

const EXPENSE_PROMPT = `EXPENSE TOOLS:
- getGroupMembers: Get all group members. Set userShouldSelect=true to show member buttons.
- getDebts: See who owes money to whom.
- addExpense: Record a new expense with equal split.
- getExpenses: View recent expenses.

EXPENSE RULES:
- When user says "I paid" or clearly indicates they paid, use addExpense with currentUserPaid=true.
- When unclear who paid, call getGroupMembers with userShouldSelect=true, context="payer" to show member buttons.
- After user selects a member, call addExpense with paidByMemberName.
- Member names are matched case-insensitively.`;

/**
 * Builds a system prompt based on which tools are enabled
 */
export function buildToolsSystemPrompt(options: ChatToolsOptions): string {
  const sections: string[] = [];

  if (options.shoppingList && options.expenses) {
    sections.push(
      "You have access to tools for managing shopping lists and expenses in the current group.",
    );
  } else if (options.shoppingList) {
    sections.push(
      "You have access to tools for managing shopping lists in the current group.",
    );
  } else if (options.expenses) {
    sections.push(
      "You have access to tools for managing expenses in the current group.",
    );
  }

  if (options.shoppingList) {
    sections.push(SHOPPING_LIST_PROMPT);
  }

  if (options.expenses) {
    sections.push(EXPENSE_PROMPT);
  }

  sections.push(
    "All tools are scoped to the current group - you cannot access other groups.",
  );

  sections.push(
    "IMPORTANT: Tool results are automatically displayed in the UI. Do NOT repeat or list the data returned by tools in your response. Just acknowledge the action briefly (e.g., 'Here are your items' or 'Added to the list') without listing the items/expenses/debts yourself.",
  );

  return sections.join("\n\n");
}

/**
 * Options for which tool categories to enable
 */
export interface ChatToolsOptions {
  shoppingList: boolean;
  expenses: boolean;
}

/**
 * Creates chat tools scoped to a specific group, filtered by options
 */
export function createChatTools(
  ctx: TRPCContext,
  groupId: number,
  options: ChatToolsOptions,
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  // =========================================================================
  // Shopping List Tools
  // =========================================================================
  if (options.shoppingList) {
    tools.getShoppingLists = tool({
      description:
        "Get all shopping lists in the current group. Set userShouldSelect=true to show clickable buttons for the user to pick a list.",
      inputSchema: zodSchema(
        z.object({
          userShouldSelect: z
            .boolean()
            .describe(
              "Set to true to show clickable list options for user selection.",
            ),
        }),
      ),
      execute: async ({
        userShouldSelect,
      }: {
        userShouldSelect: boolean;
      }): Promise<GetShoppingListsResult> => {
        // Get the group with its shopping lists
        const group = await ctx.db.query.groups.findFirst({
          where: eq(groups.id, groupId),
          columns: { id: true, name: true },
          with: {
            shoppingLists: {
              columns: { id: true, name: true },
              with: {
                shoppingListItems: {
                  columns: { id: true },
                  where: eq(shoppingListItems.completed, false),
                },
              },
            },
          },
        });

        if (!group) {
          return { lists: [], userShouldSelect };
        }

        const lists: ShoppingListInfo[] = group.shoppingLists.map((list) => ({
          id: list.id,
          name: list.name,
          groupId: group.id,
          groupName: group.name,
          uncheckedItemLength: list.shoppingListItems.length,
        }));

        return { lists, userShouldSelect };
      },
    });

    tools.addToShoppingList = tool({
      description:
        "Add items to a shopping list. Get the shoppingListId from getShoppingLists first.",
      inputSchema: zodSchema(
        z.object({
          shoppingListId: z.number().describe("The shopping list ID"),
          items: z
            .array(
              z.object({
                name: z.string().min(1).max(256).describe("Item name"),
                categoryId: categoryIdSchema.optional().describe("Category"),
              }),
            )
            .min(1)
            .max(50)
            .describe("Items to add"),
        }),
      ),
      execute: async ({
        shoppingListId,
        items,
      }: {
        shoppingListId: number;
        items: { name: string; categoryId?: CategoryId }[];
      }): Promise<AddToShoppingListResult> => {
        // Verify membership and get list
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
              reason: "Not a member of this group",
            })),
          };
        }

        const list = await ctx.db.query.shoppingLists.findFirst({
          where: and(
            eq(shoppingLists.id, shoppingListId),
            eq(shoppingLists.groupId, groupId),
          ),
          columns: { id: true, name: true },
        });

        if (!list) {
          return {
            success: false,
            shoppingListName: "",
            addedItems: [],
            failedItems: items.map((item) => ({
              name: item.name,
              reason: "Shopping list not found in this group",
            })),
          };
        }

        const addedItems: AddToShoppingListResult["addedItems"] = [];
        const failedItems: NonNullable<AddToShoppingListResult["failedItems"]> =
          [];

        for (const item of items) {
          try {
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
              .returning({ id: shoppingListItems.id });

            if (inserted) {
              addedItems.push({ id: inserted.id, name: item.name, categoryId });
            }
          } catch (error) {
            failedItems.push({
              name: item.name,
              reason: error instanceof Error ? error.message : "Failed to add",
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
    });

    tools.getShoppingListItems = tool({
      description: "Get items from a shopping list. Returns up to 50 items.",
      inputSchema: zodSchema(
        z.object({
          shoppingListId: z.number().describe("The shopping list ID"),
          includeCompleted: z
            .boolean()
            .optional()
            .describe("Include completed items"),
        }),
      ),
      execute: async ({
        shoppingListId,
        includeCompleted = false,
      }: {
        shoppingListId: number;
        includeCompleted?: boolean;
      }): Promise<GetShoppingListItemsResult> => {
        const list = await ctx.db.query.shoppingLists.findFirst({
          where: and(
            eq(shoppingLists.id, shoppingListId),
            eq(shoppingLists.groupId, groupId),
          ),
          columns: { name: true },
        });

        if (!list) {
          return { items: [], listName: "", totalCount: 0 };
        }

        const whereClause = includeCompleted
          ? eq(shoppingListItems.shoppingListId, shoppingListId)
          : and(
              eq(shoppingListItems.shoppingListId, shoppingListId),
              eq(shoppingListItems.completed, false),
            );

        const items = await ctx.db.query.shoppingListItems.findMany({
          where: whereClause,
          columns: { id: true, name: true, categoryId: true, completed: true },
          orderBy: [
            asc(shoppingListItems.completed), // unchecked first
            desc(shoppingListItems.createdAt), // then by most recent
          ],
          limit: 50,
        });

        const mappedItems = items.map((i) => ({
          id: i.id,
          name: i.name,
          categoryId: i.categoryId as CategoryId,
          completed: i.completed,
        }));
        return {
          items: mappedItems,
          listName: list.name,
          totalCount: items.length,
        };
      },
    });

    tools.markItemComplete = tool({
      description:
        "Mark a shopping list item as complete or incomplete by name.",
      inputSchema: zodSchema(
        z.object({
          shoppingListId: z.number().describe("The shopping list ID"),
          itemName: z.string().describe("Item name (case-insensitive)"),
          completed: z
            .boolean()
            .describe("true to mark complete, false to unmark"),
        }),
      ),
      execute: async ({
        shoppingListId,
        itemName,
        completed,
      }: {
        shoppingListId: number;
        itemName: string;
        completed: boolean;
      }): Promise<MarkItemCompleteResult> => {
        // Verify list belongs to group
        const list = await ctx.db.query.shoppingLists.findFirst({
          where: and(
            eq(shoppingLists.id, shoppingListId),
            eq(shoppingLists.groupId, groupId),
          ),
        });

        if (!list) {
          return {
            success: false,
            itemName,
            completed,
            error: "List not found",
          };
        }

        // Find item by name (case-insensitive)
        const item = await ctx.db.query.shoppingListItems.findFirst({
          where: and(
            eq(shoppingListItems.shoppingListId, shoppingListId),
            ilike(shoppingListItems.name, itemName),
          ),
        });

        if (!item) {
          return {
            success: false,
            itemName,
            completed,
            error: "Item not found",
          };
        }

        // Get membership for tracking who completed it
        const membership = await ctx.db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, ctx.session.user.id),
          ),
        });

        await ctx.db
          .update(shoppingListItems)
          .set({
            completed,
            completedByGroupMemberId: completed
              ? (membership?.id ?? null)
              : null,
            completedAt: completed ? new Date() : null,
          })
          .where(eq(shoppingListItems.id, item.id));

        return { success: true, itemName: item.name, completed };
      },
    });

    tools.removeItem = tool({
      description: "Remove an item from a shopping list by name.",
      inputSchema: zodSchema(
        z.object({
          shoppingListId: z.number().describe("The shopping list ID"),
          itemName: z.string().describe("Item name (case-insensitive)"),
        }),
      ),
      execute: async ({
        shoppingListId,
        itemName,
      }: {
        shoppingListId: number;
        itemName: string;
      }): Promise<RemoveItemResult> => {
        const list = await ctx.db.query.shoppingLists.findFirst({
          where: and(
            eq(shoppingLists.id, shoppingListId),
            eq(shoppingLists.groupId, groupId),
          ),
        });

        if (!list) {
          return {
            success: false,
            removedItemName: itemName,
            error: "List not found",
          };
        }

        const item = await ctx.db.query.shoppingListItems.findFirst({
          where: and(
            eq(shoppingListItems.shoppingListId, shoppingListId),
            ilike(shoppingListItems.name, itemName),
          ),
        });

        if (!item) {
          return {
            success: false,
            removedItemName: itemName,
            error: "Item not found",
          };
        }

        await ctx.db
          .delete(shoppingListItems)
          .where(eq(shoppingListItems.id, item.id));

        return { success: true, removedItemName: item.name };
      },
    });
  }

  // =========================================================================
  // Expense Tools
  // =========================================================================
  if (options.expenses) {
    tools.getGroupMembers = tool({
      description:
        "Get all members in the current group. Set userShouldSelect=true to show member buttons for the user to pick.",
      inputSchema: zodSchema(
        z.object({
          userShouldSelect: z
            .boolean()
            .describe("Set to true to show member buttons for selection."),
          context: z
            .enum(["payer", "split"])
            .optional()
            .describe("Context for the selection (e.g., 'payer' for who paid)"),
        }),
      ),
      execute: async ({
        userShouldSelect,
        context,
      }: {
        userShouldSelect: boolean;
        context?: "payer" | "split";
      }): Promise<GetGroupMembersResult> => {
        const group = await ctx.db.query.groups.findFirst({
          where: eq(groups.id, groupId),
          columns: { id: true, name: true },
        });

        if (!group) {
          return {
            members: [],
            userShouldSelect,
            context,
            groupName: "",
          };
        }

        const members = await ctx.db.query.groupMembers.findMany({
          where: eq(groupMembers.groupId, groupId),
          with: { user: { columns: { id: true, name: true, image: true } } },
        });

        return {
          members: members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            image: m.user.image,
            isCurrentUser: m.user.id === ctx.session.user.id,
          })),
          userShouldSelect,
          context,
          groupName: group.name,
        };
      },
    });

    tools.getDebts = tool({
      description: "Get who owes money to whom in the current group.",
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<GetDebtsResult> => {
        const group = await ctx.db.query.groups.findFirst({
          where: eq(groups.id, groupId),
          columns: { name: true },
        });

        if (!group) {
          return { debts: [], groupName: "" };
        }

        // Get all expenses with splits for this group
        const groupExpenses = await ctx.db.query.expenses.findMany({
          where: eq(expenses.groupId, groupId),
          with: {
            paidByGroupMember: {
              with: { user: { columns: { name: true } } },
            },
            expenseSplits: {
              with: {
                groupMember: {
                  with: { user: { columns: { name: true } } },
                },
              },
            },
          },
        });

        // Get all group members for name lookup
        const members = await ctx.db.query.groupMembers.findMany({
          where: eq(groupMembers.groupId, groupId),
          with: { user: { columns: { name: true } } },
        });

        const memberNameMap = new Map(members.map((m) => [m.id, m.user.name]));

        // Calculate debts using existing logic
        const expensesForCalc = groupExpenses.map((e) => ({
          paidByGroupMemberId: e.paidByGroupMemberId,
          amountInCents: e.amountInCents,
          currency: e.currency,
          expenseSplits: e.expenseSplits.map((s) => ({
            groupMemberId: s.groupMemberId,
            amountInCents: s.amountInCents,
          })),
        }));

        const debtSummary = calculateDebts(expensesForCalc);

        // Flatten debts from all currencies
        const debts: GetDebtsResult["debts"] = [];
        for (const [currency, summary] of Object.entries(
          debtSummary.currencies,
        )) {
          for (const debt of summary.debts) {
            debts.push({
              fromMember:
                memberNameMap.get(debt.fromGroupMemberId) ?? "Unknown",
              toMember: memberNameMap.get(debt.toGroupMemberId) ?? "Unknown",
              amountInCents: debt.amountInCents,
              currency,
            });
          }
        }

        return { debts, groupName: group.name };
      },
    });

    tools.addExpense = tool({
      description:
        "Add a new expense with equal split. Use currentUserPaid=true when user paid, or paidByMemberName for others.",
      inputSchema: zodSchema(
        z.object({
          amountInCents: z.number().min(1).describe("Amount in cents"),
          currency: z.enum(["EUR", "USD", "GBP"]).describe("Currency"),
          description: z.string().describe("What was this expense for"),
          paidByMemberName: z
            .string()
            .optional()
            .describe("Name of person who paid (if not current user)"),
          currentUserPaid: z
            .boolean()
            .optional()
            .describe("Set to true if the current user paid"),
          splitAmongNames: z
            .array(z.string())
            .optional()
            .describe(
              "Names of people to split among (defaults to all members)",
            ),
        }),
      ),
      execute: async ({
        amountInCents,
        currency,
        description,
        paidByMemberName,
        currentUserPaid,
        splitAmongNames,
      }: {
        amountInCents: number;
        currency: "EUR" | "USD" | "GBP";
        description: string;
        paidByMemberName?: string;
        currentUserPaid?: boolean;
        splitAmongNames?: string[];
      }): Promise<AddExpenseResult> => {
        // Get all members
        const members = await ctx.db.query.groupMembers.findMany({
          where: eq(groupMembers.groupId, groupId),
          with: { user: { columns: { id: true, name: true } } },
        });

        if (members.length === 0) {
          return {
            success: false,
            description,
            splits: [],
            error: "No members found in group",
          };
        }

        // Find who paid
        let payer;
        if (currentUserPaid) {
          payer = members.find((m) => m.user.id === ctx.session.user.id);
        } else if (paidByMemberName) {
          payer = members.find(
            (m) => m.user.name.toLowerCase() === paidByMemberName.toLowerCase(),
          );
        }

        if (!payer) {
          return {
            success: false,
            description,
            splits: [],
            error: currentUserPaid
              ? "Current user not found in group"
              : paidByMemberName
                ? `Member "${paidByMemberName}" not found. Available: ${members.map((m) => m.user.name).join(", ")}`
                : "Either paidByMemberName or currentUserPaid is required",
          };
        }

        // Determine who to split among
        let splitMembers = members;
        if (splitAmongNames && splitAmongNames.length > 0) {
          splitMembers = [];
          for (const name of splitAmongNames) {
            const member = members.find(
              (m) => m.user.name.toLowerCase() === name.toLowerCase(),
            );
            if (!member) {
              return {
                success: false,
                description,
                splits: [],
                error: `Member "${name}" not found`,
              };
            }
            splitMembers.push(member);
          }
        }

        // Calculate equal splits
        const memberIds = splitMembers.map((m) => m.id);
        const calculatedSplits = distributeEqualAmounts(
          memberIds,
          amountInCents,
        );

        // Get current user's membership for createdBy
        const currentMembership = members.find(
          (m) => m.user.id === ctx.session.user.id,
        );

        // Create expense
        const [expense] = await ctx.db
          .insert(expenses)
          .values({
            groupId,
            paidByGroupMemberId: payer.id,
            amountInCents,
            currency,
            description,
            expenseDate: new Date(),
            createdByGroupMemberId: currentMembership?.id ?? payer.id,
            splitMethod: "equal",
          })
          .returning({ id: expenses.id });

        if (!expense) {
          return {
            success: false,
            description,
            splits: [],
            error: "Failed to create expense",
          };
        }

        // Create splits using the calculated amounts
        const splitValues = calculatedSplits.map((split) => ({
          expenseId: expense.id,
          groupMemberId: split.groupMemberId,
          amountInCents: split.amountInCents,
          percentage: split.percentage,
        }));

        await ctx.db.insert(expenseSplits).values(splitValues);

        // Map back to member names for result
        const memberIdToName = new Map(
          splitMembers.map((m) => [m.id, m.user.name]),
        );

        return {
          success: true,
          expenseId: expense.id,
          description,
          splits: calculatedSplits.map((s) => ({
            memberName: memberIdToName.get(s.groupMemberId) ?? "Unknown",
            amountInCents: s.amountInCents,
          })),
        };
      },
    });

    tools.getExpenses = tool({
      description: "Get recent expenses in the current group.",
      inputSchema: zodSchema(
        z.object({
          limit: z
            .number()
            .min(1)
            .max(20)
            .optional()
            .describe("Number of expenses (default 10)"),
        }),
      ),
      execute: async ({
        limit = 10,
      }: {
        limit?: number;
      }): Promise<GetExpensesResult> => {
        const group = await ctx.db.query.groups.findFirst({
          where: eq(groups.id, groupId),
          columns: { name: true },
        });

        if (!group) {
          return { expenses: [], groupName: "" };
        }

        const recentExpenses = await ctx.db.query.expenses.findMany({
          where: eq(expenses.groupId, groupId),
          orderBy: [desc(expenses.expenseDate)],
          limit,
          with: {
            paidByGroupMember: {
              with: { user: { columns: { name: true } } },
            },
          },
        });

        return {
          expenses: recentExpenses.map((e) => ({
            id: e.id,
            description: e.description,
            amountInCents: e.amountInCents,
            currency: e.currency,
            paidByMember: e.paidByGroupMember.user.name,
            expenseDate: e.expenseDate.toISOString(),
          })),
          groupName: group.name,
        };
      },
    });
  }

  return tools;
}

// Keep old function name for backwards compatibility
export const createShoppingListTools = createChatTools;
