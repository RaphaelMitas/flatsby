import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { z } from "zod";

/**
 * Get the appropriate model provider based on the model string
 */
function getModelProvider(model: string) {
  if (model.startsWith("openai/")) {
    const modelId = model.replace("openai/", "");
    return openai(modelId);
  }
  if (model.startsWith("google/")) {
    const modelId = model.replace("google/", "");
    return google(modelId);
  }
  // Default to Gemini
  return google("gemini-2.0-flash");
}

/**
 * Shopping list tools for the agent
 */
const addShoppingListItemTool = createTool({
  description: "Add an item to a shopping list",
  args: z.object({
    shoppingListId: z.string().describe("The ID of the shopping list"),
    name: z.string().describe("The name of the item to add"),
    category: z.string().optional().describe("The category of the item"),
  }),
  handler: async (ctx, args) => {
    const { db } = ctx;
    const shoppingList = await db.get(args.shoppingListId as Id<"shoppingLists">);
    if (!shoppingList) {
      return { success: false, error: "Shopping list not found" };
    }

    const itemId = await db.insert("shoppingListItems", {
      shoppingListId: args.shoppingListId as Id<"shoppingLists">,
      name: args.name,
      categoryId: args.category ?? "other",
      completed: false,
    });

    return {
      success: true,
      itemId,
      message: `Added "${args.name}" to the shopping list`,
    };
  },
});

const removeShoppingListItemTool = createTool({
  description: "Remove an item from a shopping list by name",
  args: z.object({
    shoppingListId: z.string().describe("The ID of the shopping list"),
    itemName: z.string().describe("The name of the item to remove"),
  }),
  handler: async (ctx, args) => {
    const { db } = ctx;
    const items = await db
      .query("shoppingListItems")
      .withIndex("by_shopping_list", (q) =>
        q.eq("shoppingListId", args.shoppingListId as Id<"shoppingLists">)
      )
      .collect();

    const itemToRemove = items.find(
      (item) => item.name.toLowerCase() === args.itemName.toLowerCase()
    );

    if (!itemToRemove) {
      return { success: false, error: `Item "${args.itemName}" not found` };
    }

    await db.delete(itemToRemove._id);

    return {
      success: true,
      message: `Removed "${args.itemName}" from the shopping list`,
    };
  },
});

const completeShoppingListItemTool = createTool({
  description: "Mark a shopping list item as completed",
  args: z.object({
    shoppingListId: z.string().describe("The ID of the shopping list"),
    itemName: z.string().describe("The name of the item to mark as completed"),
  }),
  handler: async (ctx, args) => {
    const { db } = ctx;
    const items = await db
      .query("shoppingListItems")
      .withIndex("by_shopping_list", (q) =>
        q.eq("shoppingListId", args.shoppingListId as Id<"shoppingLists">)
      )
      .collect();

    const item = items.find(
      (item) => item.name.toLowerCase() === args.itemName.toLowerCase()
    );

    if (!item) {
      return { success: false, error: `Item "${args.itemName}" not found` };
    }

    await db.patch(item._id, {
      completed: true,
      completedAt: Date.now(),
    });

    return {
      success: true,
      message: `Marked "${args.itemName}" as completed`,
    };
  },
});

const getShoppingListItemsTool = createTool({
  description: "Get all items from a shopping list",
  args: z.object({
    shoppingListId: z.string().describe("The ID of the shopping list"),
    showCompleted: z.boolean().optional().describe("Whether to include completed items"),
  }),
  handler: async (ctx, args) => {
    const { db } = ctx;
    const items = await db
      .query("shoppingListItems")
      .withIndex("by_shopping_list", (q) =>
        q.eq("shoppingListId", args.shoppingListId as Id<"shoppingLists">)
      )
      .collect();

    const filteredItems = args.showCompleted
      ? items
      : items.filter((item) => !item.completed);

    return {
      items: filteredItems.map((item) => ({
        id: item._id,
        name: item.name,
        category: item.categoryId,
        completed: item.completed,
      })),
      totalCount: items.length,
      pendingCount: items.filter((item) => !item.completed).length,
    };
  },
});

/**
 * Expense tools for the agent
 */
const getGroupBalancesTool = createTool({
  description: "Get the current expense balances/debts for a group",
  args: z.object({
    groupId: z.string().describe("The ID of the group"),
  }),
  handler: async (ctx, args) => {
    const { db } = ctx;

    // Get all expenses for the group
    const expenses = await db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId as Id<"groups">))
      .collect();

    // Get splits for each expense and calculate balances
    const balances = new Map<string, number>();

    for (const expense of expenses) {
      const splits = await db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();

      // The payer gains credit
      const payerBalance = balances.get(expense.paidByGroupMemberId) ?? 0;
      balances.set(expense.paidByGroupMemberId, payerBalance + expense.amountInCents);

      // Each split member owes their share
      for (const split of splits) {
        const memberBalance = balances.get(split.groupMemberId) ?? 0;
        balances.set(split.groupMemberId, memberBalance - split.amountInCents);
      }
    }

    // Get member info
    const members = await db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId as Id<"groups">))
      .collect();

    const balancesWithNames = await Promise.all(
      Array.from(balances.entries()).map(async ([memberId, balance]) => {
        const member = await db.get(memberId as Id<"groupMembers">);
        const user = member ? await db.get(member.userId) : null;
        return {
          memberId,
          memberName: user?.name ?? "Unknown",
          balanceInCents: balance,
          owesOrOwed: balance > 0 ? "is owed" : balance < 0 ? "owes" : "settled",
        };
      })
    );

    return { balances: balancesWithNames };
  },
});

const addExpenseTool = createTool({
  description: "Add a new expense to split among group members",
  args: z.object({
    groupId: z.string().describe("The ID of the group"),
    paidByMemberId: z.string().describe("The ID of the group member who paid"),
    amountInCents: z.number().describe("The amount in cents"),
    currency: z.string().describe("The currency code (e.g., USD, EUR)"),
    description: z.string().optional().describe("Description of the expense"),
    splitEquallyAmongAll: z.boolean().describe("Whether to split equally among all members"),
  }),
  handler: async (ctx, args) => {
    const { db } = ctx;

    // Get all group members
    const members = await db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId as Id<"groups">))
      .collect();

    if (members.length === 0) {
      return { success: false, error: "No members found in group" };
    }

    // Create the expense
    const expenseId = await db.insert("expenses", {
      groupId: args.groupId as Id<"groups">,
      paidByGroupMemberId: args.paidByMemberId as Id<"groupMembers">,
      amountInCents: args.amountInCents,
      currency: args.currency,
      description: args.description,
      expenseDate: Date.now(),
      createdByGroupMemberId: args.paidByMemberId as Id<"groupMembers">,
      splitMethod: "equal",
    });

    // Create equal splits
    const splitAmount = Math.floor(args.amountInCents / members.length);
    const remainder = args.amountInCents - splitAmount * members.length;

    for (let i = 0; i < members.length; i++) {
      const member = members[i]!;
      // Give the remainder to the first person
      const amount = i === 0 ? splitAmount + remainder : splitAmount;
      await db.insert("expenseSplits", {
        expenseId,
        groupMemberId: member._id,
        amountInCents: amount,
      });
    }

    return {
      success: true,
      expenseId,
      message: `Added expense of ${args.amountInCents / 100} ${args.currency} split among ${members.length} members`,
    };
  },
});

/**
 * Define the Flatsby household assistant agent
 */
export const flatsbyAgent = new Agent(components.agent, {
  name: "Flatsby Assistant",
  chat: getModelProvider("google/gemini-2.0-flash"),

  instructions: `You are Flatsby, a helpful household management assistant. You help users manage their shared living spaces, including:

1. **Shopping Lists**: Help users add, remove, and track items on their shopping lists. You can mark items as complete when they've been purchased.

2. **Expenses**: Help users track shared expenses and see who owes what. You can add new expenses and calculate balances.

3. **General Assistance**: Answer questions about household management, provide helpful tips, and assist with day-to-day household tasks.

Be friendly, concise, and helpful. When using tools, confirm what you're about to do before making changes. If you're unsure about which shopping list or group to use, ask the user for clarification.

Always format currency amounts properly (e.g., $10.50 instead of 1050 cents).`,

  tools: {
    addShoppingListItem: addShoppingListItemTool,
    removeShoppingListItem: removeShoppingListItemTool,
    completeShoppingListItem: completeShoppingListItemTool,
    getShoppingListItems: getShoppingListItemsTool,
    getGroupBalances: getGroupBalancesTool,
    addExpense: addExpenseTool,
  },
});

/**
 * Type for agent context with user info
 */
export interface AgentContext {
  userId: Id<"users">;
  groupId?: Id<"groups">;
  shoppingListId?: Id<"shoppingLists">;
}
