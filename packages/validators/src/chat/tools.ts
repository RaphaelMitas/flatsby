import type { UIMessage as AIUIMessage, InferUITools, ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod/v4";

import type { MessageMetadata } from "./messages";
import { categoryIdSchema } from "../categories";
import { currencyCodeSchema } from "../expenses/schemas";
import { groupNameSchema, groupSchema } from "../group";
import { shoppingListItemSchema, shoppingListSchema } from "../shopping-list";

// ============================================================================
// Shopping List Tools
// ============================================================================

// Reusable item schemas built from shoppingListItemSchema
const toolItemInputSchema = shoppingListItemSchema
  .pick({ name: true })
  .extend({ categoryId: categoryIdSchema.optional() });

const toolAddedItemSchema = shoppingListItemSchema.pick({
  id: true,
  name: true,
  categoryId: true,
});

const toolFailedItemSchema = shoppingListItemSchema
  .pick({ name: true })
  .extend({ reason: z.string() });

export const addedItemSchema = toolAddedItemSchema;
export type AddedItem = z.infer<typeof addedItemSchema>;

// getShoppingLists
export const shoppingListInfoSchema = shoppingListSchema
  .pick({ id: true, name: true })
  .extend({
    groupId: groupSchema.shape.id,
    groupName: groupNameSchema,
    uncheckedItemLength: z.number(),
  });
export type ShoppingListInfo = z.infer<typeof shoppingListInfoSchema>;

export const getShoppingListsInputSchema = z.object({
  userShouldSelect: z.boolean(),
});

export const getShoppingListsResultSchema = z.object({
  lists: z.array(shoppingListInfoSchema),
  userShouldSelect: z.boolean(),
});
export type GetShoppingListsResult = z.infer<
  typeof getShoppingListsResultSchema
>;

// addToShoppingList
export const addToShoppingListInputSchema = z.object({
  shoppingListId: z.number(),
  items: z.array(toolItemInputSchema),
});

export const addToShoppingListResultSchema = z.object({
  success: z.boolean(),
  shoppingListName: shoppingListSchema.shape.name,
  addedItems: z.array(addedItemSchema),
  failedItems: z.array(toolFailedItemSchema).optional(),
});
export type AddToShoppingListResult = z.infer<
  typeof addToShoppingListResultSchema
>;

// getShoppingListItems
export const getShoppingListItemsInputSchema = z.object({
  shoppingListId: z.number(),
  includeCompleted: z.boolean().optional(),
});

const shoppingListItemOutputSchema = shoppingListItemSchema.pick({
  id: true,
  name: true,
  categoryId: true,
  completed: true,
});

export const getShoppingListItemsResultSchema = z.object({
  items: z.array(shoppingListItemOutputSchema),
  listName: z.string(),
  totalCount: z.number(),
});
export type GetShoppingListItemsResult = z.infer<
  typeof getShoppingListItemsResultSchema
>;

// markItemComplete
export const markItemCompleteInputSchema = z.object({
  shoppingListId: z.number(),
  itemName: z.string(),
  completed: z.boolean(),
});

export const markItemCompleteResultSchema = z.object({
  success: z.boolean(),
  itemName: z.string(),
  completed: z.boolean(),
  error: z.string().optional(),
});
export type MarkItemCompleteResult = z.infer<
  typeof markItemCompleteResultSchema
>;

// removeItem
export const removeItemInputSchema = z.object({
  shoppingListId: z.number(),
  itemName: z.string(),
});

export const removeItemResultSchema = z.object({
  success: z.boolean(),
  removedItemName: z.string(),
  error: z.string().optional(),
});
export type RemoveItemResult = z.infer<typeof removeItemResultSchema>;

// ============================================================================
// Group Member Tools
// ============================================================================

export const groupMemberInfoSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  isCurrentUser: z.boolean(),
});
export type GroupMemberInfo = z.infer<typeof groupMemberInfoSchema>;

export const getGroupMembersInputSchema = z.object({
  userShouldSelect: z.boolean(),
  context: z.enum(["payer", "split"]).optional(),
});

export const getGroupMembersResultSchema = z.object({
  members: z.array(groupMemberInfoSchema),
  userShouldSelect: z.boolean(),
  context: z.enum(["payer", "split"]).optional(),
  groupName: z.string(),
});
export type GetGroupMembersResult = z.infer<typeof getGroupMembersResultSchema>;

// ============================================================================
// Expense Tools
// ============================================================================

// getDebts
export const getDebtsInputSchema = z.object({});

const debtEntrySchema = z.object({
  fromMember: z.string(),
  toMember: z.string(),
  amountInCents: z.number(),
  currency: z.string(),
});

export const getDebtsResultSchema = z.object({
  debts: z.array(debtEntrySchema),
  groupName: z.string(),
});
export type GetDebtsResult = z.infer<typeof getDebtsResultSchema>;

// addExpense - ID-based operations (AI gets IDs from getGroupMembers first)
export const expenseSplitInputSchema = z.object({
  groupMemberId: z.number(),
  amountInCents: z.number(),
});
export type ExpenseSplitInput = z.infer<typeof expenseSplitInputSchema>;

export const addExpenseInputSchema = z.object({
  amountInCents: z.number(),
  currency: currencyCodeSchema,
  description: z.string(),

  // Payer - use ID or currentUserPaid flag
  paidByGroupMemberId: z.number().optional(),
  currentUserPaid: z.boolean().optional(),

  // Split configuration
  splitMethod: z.enum(["equal", "custom"]).default("equal"),
  splits: z.array(expenseSplitInputSchema).optional(), // Required if splitMethod="custom"
  splitAmongMemberIds: z.array(z.number()).optional(), // For equal split subset

  // UI control - show split editor before creating
  userShouldConfirmSplits: z.boolean().optional(),
});

const expenseSplitOutputSchema = z.object({
  groupMemberId: z.number().optional(), // Optional for backward compatibility with old messages
  memberName: z.string(),
  amountInCents: z.number(),
});
export type ExpenseSplitOutput = z.infer<typeof expenseSplitOutputSchema>;

// Pending expense split - requires groupMemberId for split editor to work
const pendingExpenseSplitSchema = z.object({
  groupMemberId: z.number(),
  memberName: z.string(),
  amountInCents: z.number(),
});

// Pending expense for userShouldConfirmSplits flow
export const pendingExpenseSchema = z.object({
  amountInCents: z.number(),
  currency: currencyCodeSchema,
  description: z.string(),
  paidByGroupMemberId: z.number(),
  paidByMemberName: z.string(),
  splits: z.array(pendingExpenseSplitSchema),
});
export type PendingExpense = z.infer<typeof pendingExpenseSchema>;

export const addExpenseResultSchema = z.object({
  success: z.boolean(),
  expenseId: z.number().optional(),
  description: z.string(),
  splits: z.array(expenseSplitOutputSchema),
  error: z.string().optional(),

  // For userShouldConfirmSplits=true - returns pending expense for UI
  // Nullable because it gets set to null when expense is confirmed/cancelled
  pendingExpense: pendingExpenseSchema.nullable().optional(),
  userShouldConfirmSplits: z.boolean().optional(),
  cancelled: z.boolean().optional(),
});
export type AddExpenseResult = z.infer<typeof addExpenseResultSchema>;

// getExpenses
export const getExpensesInputSchema = z.object({
  limit: z.number().min(1).max(20).optional(),
});

const expenseOutputSchema = z.object({
  id: z.number(),
  description: z.string().nullable(),
  amountInCents: z.number(),
  currency: z.string(),
  paidByMember: z.string(),
  expenseDate: z.string(),
});

export const getExpensesResultSchema = z.object({
  expenses: z.array(expenseOutputSchema),
  groupName: z.string(),
});
export type GetExpensesResult = z.infer<typeof getExpensesResultSchema>;

// ============================================================================
// Persisted Tool Calls
// ============================================================================

const getShoppingListsToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("getShoppingLists"),
  input: getShoppingListsInputSchema,
  output: getShoppingListsResultSchema,
});

const addToShoppingListToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("addToShoppingList"),
  input: addToShoppingListInputSchema,
  output: addToShoppingListResultSchema,
});

const getShoppingListItemsToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("getShoppingListItems"),
  input: getShoppingListItemsInputSchema,
  output: getShoppingListItemsResultSchema,
});

const markItemCompleteToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("markItemComplete"),
  input: markItemCompleteInputSchema,
  output: markItemCompleteResultSchema,
});

const removeItemToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("removeItem"),
  input: removeItemInputSchema,
  output: removeItemResultSchema,
});

const getGroupMembersToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("getGroupMembers"),
  input: getGroupMembersInputSchema,
  output: getGroupMembersResultSchema,
});

const getDebtsToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("getDebts"),
  input: getDebtsInputSchema,
  output: getDebtsResultSchema,
});

const addExpenseToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("addExpense"),
  input: addExpenseInputSchema,
  output: addExpenseResultSchema,
});

const getExpensesToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("getExpenses"),
  input: getExpensesInputSchema,
  output: getExpensesResultSchema,
});

export const persistedToolCallSchema = z.discriminatedUnion("name", [
  getShoppingListsToolCallSchema,
  addToShoppingListToolCallSchema,
  getShoppingListItemsToolCallSchema,
  markItemCompleteToolCallSchema,
  removeItemToolCallSchema,
  getGroupMembersToolCallSchema,
  getDebtsToolCallSchema,
  addExpenseToolCallSchema,
  getExpensesToolCallSchema,
]);

export type PersistedToolCall = z.infer<typeof persistedToolCallSchema>;

// Partial output update schema - for updating specific fields in tool call outputs
// Used by updateToolCallOutput mutation to modify persisted state (e.g., split editor confirm/cancel)
export const persistedToolCallOutputUpdateSchema = z.object({
  // addExpense output updates
  expenseId: z.number().optional(),
  userShouldConfirmSplits: z.boolean().optional(),
  pendingExpense: pendingExpenseSchema.optional().nullable(),
  cancelled: z.boolean().optional(),
});
export type PersistedToolCallOutputUpdate = z.infer<
  typeof persistedToolCallOutputUpdateSchema
>;

/**
 * Helper to update an object's output while preserving its type.
 * Works with both PersistedToolCall (API) and OutputAvailableToolPart (UI).
 */
export function withUpdatedOutput<T extends { output: object }>(
  item: T,
  update: PersistedToolCallOutputUpdate,
): T {
  return {
    ...item,
    output: { ...item.output, ...update },
  };
}

// ============================================================================
// AI SDK Tool Definitions (for type inference)
// ============================================================================

export const chatTools = {
  getShoppingLists: tool({
    description: "Get all shopping lists in the current group",
    inputSchema: getShoppingListsInputSchema,
    outputSchema: getShoppingListsResultSchema,
  }),
  addToShoppingList: tool({
    description: "Add items to a shopping list",
    inputSchema: addToShoppingListInputSchema,
    outputSchema: addToShoppingListResultSchema,
  }),
  getShoppingListItems: tool({
    description: "Get items from a shopping list",
    inputSchema: getShoppingListItemsInputSchema,
    outputSchema: getShoppingListItemsResultSchema,
  }),
  markItemComplete: tool({
    description: "Mark a shopping list item as complete or incomplete",
    inputSchema: markItemCompleteInputSchema,
    outputSchema: markItemCompleteResultSchema,
  }),
  removeItem: tool({
    description: "Remove an item from a shopping list",
    inputSchema: removeItemInputSchema,
    outputSchema: removeItemResultSchema,
  }),
  getGroupMembers: tool({
    description: "Get all members in the current group for selection",
    inputSchema: getGroupMembersInputSchema,
    outputSchema: getGroupMembersResultSchema,
  }),
  getDebts: tool({
    description: "Get who owes money to whom in the current group",
    inputSchema: getDebtsInputSchema,
    outputSchema: getDebtsResultSchema,
  }),
  addExpense: tool({
    description:
      "Add expense. Use member IDs from getGroupMembers. Set userShouldConfirmSplits=true to let user adjust splits before creating.",
    inputSchema: addExpenseInputSchema,
    outputSchema: addExpenseResultSchema,
  }),
  getExpenses: tool({
    description: "Get recent expenses in the current group",
    inputSchema: getExpensesInputSchema,
    outputSchema: getExpensesResultSchema,
  }),
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof chatTools>;

export type ChatUIMessage = AIUIMessage<MessageMetadata, never, ChatTools>;
