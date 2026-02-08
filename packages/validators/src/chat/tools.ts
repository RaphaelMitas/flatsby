import type { UIMessage as AIUIMessage, InferUITools, ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod/v4";

import type { MessageMetadata } from "./messages";
import {
  currencyCodeSchema,
  deleteExpenseSchema,
  expenseSchema,
  expenseSplitSchema,
} from "../expenses/schemas";
import {
  groupMemberSchema,
  groupNameSchema,
  groupSchema,
  updateGroupSchema,
} from "../group";
import {
  createShoppingListItemSchema,
  createShoppingListSchema,
  deleteShoppingListItemSchema,
  deleteShoppingListSchema,
  shoppingListItemSchema,
  shoppingListSchema,
  updateShoppingListItemSchema,
  updateShoppingListSchema,
} from "../shopping-list";
import { userImageSchema, userNameSchema } from "../user";

// ============================================================================
// searchData Tool
// ============================================================================

export const searchDataQuerySchema = z.enum([
  "shoppingLists",
  "shoppingListItems",
  "expenses",
  "groupMembers",
  "debts",
  "groups",
]);
export type SearchDataQuery = z.infer<typeof searchDataQuerySchema>;

export const searchDataInputSchema = z.object({
  query: searchDataQuerySchema.describe("Type of data to search for"),
  groupId: z.number().describe("Group ID to search within"),
  displayToUser: z
    .boolean()
    .default(true)
    .describe(
      "Set false for internal lookups (e.g. fetching member IDs). Omit or set true when user asked to see data.",
    ),
  filters: z
    .object({
      shoppingListId: z.number().optional().describe("Filter by shopping list"),
      includeCompleted: z
        .boolean()
        .optional()
        .describe("Include completed items"),
      limit: z.number().min(1).max(50).optional().describe("Maximum results"),
      dateRange: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional()
        .describe("Date range filter for expenses"),
      currency: z.string().optional().describe("Filter expenses by currency"),
    })
    .optional(),
});
export type SearchDataInput = z.infer<typeof searchDataInputSchema>;

// Shopping list info for search results
export const shoppingListInfoSchema = shoppingListSchema
  .pick({ id: true, name: true })
  .extend({
    groupId: groupSchema.shape.id,
    groupName: groupNameSchema,
    uncheckedItemCount: z.number(),
  });
export type ShoppingListInfo = z.infer<typeof shoppingListInfoSchema>;

// Shopping list item for search results
export const shoppingListItemInfoSchema = shoppingListItemSchema.pick({
  id: true,
  name: true,
  categoryId: true,
  completed: true,
});
export type ShoppingListItemInfo = z.infer<typeof shoppingListItemInfoSchema>;

// Expense info for search results
export const expenseInfoSchema = z.object({
  id: z.number(),
  description: expenseSchema.shape.description.unwrap().nullable(),
  amountInCents: expenseSchema.shape.amountInCents,
  currency: currencyCodeSchema,
  paidByMemberId: groupMemberSchema.shape.id,
  paidByMemberName: userNameSchema,
  // Use coerce.date() since dates are serialized as strings in JSON (chat message storage)
  expenseDate: z.coerce.date(),
  splits: z.array(
    z.object({
      memberId: groupMemberSchema.shape.id,
      memberName: userNameSchema,
      amountInCents: expenseSplitSchema.shape.amountInCents,
    }),
  ),
});
export type ExpenseInfo = z.infer<typeof expenseInfoSchema>;

// Group member info for search results
export const groupMemberInfoSchema = groupMemberSchema
  .pick({ id: true, userId: true, role: true })
  .extend({
    name: userNameSchema,
    image: userImageSchema,
    isCurrentUser: z.boolean(),
  });
export type GroupMemberInfo = z.infer<typeof groupMemberInfoSchema>;

// Debt info for search results
export const debtInfoSchema = z.object({
  fromMemberId: groupMemberSchema.shape.id,
  fromMemberName: userNameSchema,
  toMemberId: groupMemberSchema.shape.id,
  toMemberName: userNameSchema,
  amountInCents: expenseSplitSchema.shape.amountInCents,
  currency: currencyCodeSchema,
});
export type DebtInfo = z.infer<typeof debtInfoSchema>;

// Group info for search results
export const groupInfoSchema = groupSchema
  .pick({ id: true, name: true })
  .extend({
    memberCount: z.number(),
    isCurrentUserAdmin: z.boolean(),
  });
export type GroupInfo = z.infer<typeof groupInfoSchema>;

// Discriminated union for search results data
const searchDataResultDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("shoppingLists"),
    items: z.array(shoppingListInfoSchema),
  }),
  z.object({
    type: z.literal("shoppingListItems"),
    items: z.array(shoppingListItemInfoSchema),
    listName: z.string(),
  }),
  z.object({
    type: z.literal("expenses"),
    items: z.array(expenseInfoSchema),
  }),
  z.object({
    type: z.literal("groupMembers"),
    items: z.array(groupMemberInfoSchema),
  }),
  z.object({
    type: z.literal("debts"),
    items: z.array(debtInfoSchema),
  }),
  z.object({
    type: z.literal("groups"),
    items: z.array(groupInfoSchema),
  }),
]);

export const searchDataOutputSchema = z.object({
  success: z.boolean(),
  data: searchDataResultDataSchema,
  metadata: z.object({
    count: z.number(),
    groupName: z.string(),
  }),
  error: z.string().optional(),
});
export type SearchDataOutput = z.infer<typeof searchDataOutputSchema>;

// ============================================================================
// modifyData Tool
// ============================================================================

export const modifyDataActionSchema = z.enum(["create", "update", "delete"]);
export type ModifyDataAction = z.infer<typeof modifyDataActionSchema>;

export const modifyDataEntitySchema = z.enum([
  "shoppingListItem",
  "expense",
  "shoppingList",
  "group",
]);
export type ModifyDataEntity = z.infer<typeof modifyDataEntitySchema>;

// ============================================================================
// Combined Input Schemas - All 10 valid entity+action combinations
// ============================================================================

function modifyDataInputSchemaFor<
  E extends ModifyDataEntity,
  A extends ModifyDataAction,
  D extends z.ZodTypeAny,
>(entity: E, action: A, dataSchema: D) {
  return z.object({
    entity: z.literal(entity),
    action: z.literal(action),
    groupId: z.number().describe("Group ID for the operation"),
    data: dataSchema,
  });
}

const shoppingListItemCreateInputSchema = modifyDataInputSchemaFor(
  "shoppingListItem",
  "create",
  createShoppingListItemSchema,
);

const shoppingListItemUpdateInputSchema = modifyDataInputSchemaFor(
  "shoppingListItem",
  "update",
  updateShoppingListItemSchema,
);

const shoppingListItemDeleteInputSchema = modifyDataInputSchemaFor(
  "shoppingListItem",
  "delete",
  deleteShoppingListItemSchema,
);

const expenseCreateDataSchema = expenseSchema
  .omit({ expenseDate: true })
  .extend({
    groupId: z.number(),
    expenseDateIsoString: z
      .string()
      .optional()
      .describe("ISO date string (e.g., 2024-01-15)"),
  });

const expenseUpdateDataSchema = expenseSchema
  .omit({ expenseDate: true })
  .extend({
    expenseDateIsoString: z
      .string()
      .optional()
      .describe("ISO date string (e.g., 2024-01-15)"),
  })
  .partial()
  .extend({ expenseId: z.number() });

const expenseCreateInputSchema = modifyDataInputSchemaFor(
  "expense",
  "create",
  expenseCreateDataSchema,
);

const expenseUpdateInputSchema = modifyDataInputSchemaFor(
  "expense",
  "update",
  expenseUpdateDataSchema,
);

const expenseDeleteInputSchema = modifyDataInputSchemaFor(
  "expense",
  "delete",
  deleteExpenseSchema,
);

const shoppingListCreateInputSchema = modifyDataInputSchemaFor(
  "shoppingList",
  "create",
  createShoppingListSchema,
);

const shoppingListUpdateInputSchema = modifyDataInputSchemaFor(
  "shoppingList",
  "update",
  updateShoppingListSchema,
);

const shoppingListDeleteInputSchema = modifyDataInputSchemaFor(
  "shoppingList",
  "delete",
  deleteShoppingListSchema,
);

const groupUpdateInputSchema = modifyDataInputSchemaFor(
  "group",
  "update",
  updateGroupSchema,
);

export const modifyDataInputSchema = z.union([
  shoppingListItemCreateInputSchema,
  shoppingListItemUpdateInputSchema,
  shoppingListItemDeleteInputSchema,
  expenseCreateInputSchema,
  expenseUpdateInputSchema,
  expenseDeleteInputSchema,
  shoppingListCreateInputSchema,
  shoppingListUpdateInputSchema,
  shoppingListDeleteInputSchema,
  groupUpdateInputSchema,
]);
export type ModifyDataInput = z.infer<typeof modifyDataInputSchema>;

/**
 * Flat tool input schema for LLM consumption.
 * OpenAI requires tool parameters to be `type: "object"` — z.union produces
 * `anyOf` which is rejected. This single z.object has all possible fields
 * as optional; the strict union schema validates in the execute callback.
 *
 * Fields are derived from the individual data schemas via `.shape` spreads.
 * Spread order matters for overlapping keys — later spreads win.
 */
export const modifyDataToolInputSchema = z.object({
  entity: modifyDataEntitySchema.describe("Entity type to modify"),
  action: modifyDataActionSchema.describe("Action to perform"),
  groupId: z.number().describe("Group ID for the operation"),
  data: z
    .object({
      ...createShoppingListItemSchema.shape,
      ...updateShoppingListItemSchema.shape,
      ...deleteShoppingListItemSchema.shape,
      ...expenseCreateDataSchema.shape,
      ...expenseUpdateDataSchema.shape,
      ...deleteExpenseSchema.shape,
      ...createShoppingListSchema.shape,
      ...updateShoppingListSchema.shape,
      ...deleteShoppingListSchema.shape,
      ...updateGroupSchema.shape,
    })
    .partial()
    .describe("Entity-specific data fields"),
});

// Export individual input types for type narrowing in tool-executor
export type ShoppingListItemCreateInput = z.infer<
  typeof shoppingListItemCreateInputSchema
>;
export type ShoppingListItemUpdateInput = z.infer<
  typeof shoppingListItemUpdateInputSchema
>;
export type ShoppingListItemDeleteInput = z.infer<
  typeof shoppingListItemDeleteInputSchema
>;
export type ExpenseCreateInput = z.infer<typeof expenseCreateInputSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateInputSchema>;
export type ExpenseDeleteInput = z.infer<typeof expenseDeleteInputSchema>;
export type ShoppingListCreateInput = z.infer<
  typeof shoppingListCreateInputSchema
>;
export type ShoppingListUpdateInput = z.infer<
  typeof shoppingListUpdateInputSchema
>;
export type ShoppingListDeleteInput = z.infer<
  typeof shoppingListDeleteInputSchema
>;
export type GroupUpdateInput = z.infer<typeof groupUpdateInputSchema>;

// Result entity schemas
const shoppingListItemResultSchema = shoppingListItemSchema.pick({
  id: true,
  name: true,
  categoryId: true,
  completed: true,
});

const expenseResultSchema = z.object({
  id: z.number(),
  description: expenseSchema.shape.description.unwrap().nullable(),
  amountInCents: expenseSchema.shape.amountInCents,
  currency: currencyCodeSchema,
  paidByMemberName: userNameSchema,
  splits: z.array(
    z.object({
      memberName: userNameSchema,
      amountInCents: expenseSplitSchema.shape.amountInCents,
    }),
  ),
});

const shoppingListResultSchema = shoppingListSchema.pick({
  id: true,
  name: true,
});

const groupResultSchema = groupSchema.pick({
  id: true,
  name: true,
});

// Success output schemas discriminated by entity
const shoppingListItemSuccessOutputSchema = z.object({
  success: z.literal(true),
  action: modifyDataActionSchema,
  entity: z.literal("shoppingListItem"),
  result: shoppingListItemResultSchema,
});

const expenseSuccessOutputSchema = z.object({
  success: z.literal(true),
  action: modifyDataActionSchema,
  entity: z.literal("expense"),
  result: expenseResultSchema,
});

const shoppingListSuccessOutputSchema = z.object({
  success: z.literal(true),
  action: modifyDataActionSchema,
  entity: z.literal("shoppingList"),
  result: shoppingListResultSchema,
});

const groupSuccessOutputSchema = z.object({
  success: z.literal(true),
  action: modifyDataActionSchema,
  entity: z.literal("group"),
  result: groupResultSchema,
});

// Error output schema
const modifyDataErrorOutputSchema = z.object({
  success: z.literal(false),
  action: modifyDataActionSchema,
  entity: modifyDataEntitySchema,
  error: z.string(),
});

export const modifyDataOutputSchema = z.union([
  shoppingListItemSuccessOutputSchema,
  expenseSuccessOutputSchema,
  shoppingListSuccessOutputSchema,
  groupSuccessOutputSchema,
  modifyDataErrorOutputSchema,
]);
export type ModifyDataOutput = z.infer<typeof modifyDataOutputSchema>;

// Export individual output types for use in tool-executor
export type ShoppingListItemSuccessOutput = z.infer<
  typeof shoppingListItemSuccessOutputSchema
>;
export type ExpenseSuccessOutput = z.infer<typeof expenseSuccessOutputSchema>;
export type ShoppingListSuccessOutput = z.infer<
  typeof shoppingListSuccessOutputSchema
>;
export type GroupSuccessOutput = z.infer<typeof groupSuccessOutputSchema>;
export type ModifyDataErrorOutput = z.infer<typeof modifyDataErrorOutputSchema>;

// ============================================================================
// showUI Tool
// ============================================================================

export const showUIComponentSchema = z.enum([
  "selector",
  "quiz",
  "chart",
  "table",
  "confirmation",
]);
export type ShowUIComponent = z.infer<typeof showUIComponentSchema>;

const selectorOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
});
export type SelectorOption = z.infer<typeof selectorOptionSchema>;

const quizChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type QuizChoice = z.infer<typeof quizChoiceSchema>;

const chartDataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});
export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;

const tableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
});
export type TableColumn = z.infer<typeof tableColumnSchema>;

export const showUIInputSchema = z.object({
  component: showUIComponentSchema.describe("UI component type to display"),
  config: z
    .object({
      // Selector config
      title: z.string().optional(),
      options: z.array(selectorOptionSchema).optional(),
      multiSelect: z.boolean().optional(),

      // Quiz config
      question: z.string().optional(),
      choices: z.array(quizChoiceSchema).optional(),

      // Chart config
      chartType: z.enum(["pie", "bar", "line"]).optional(),
      data: z.array(chartDataPointSchema).optional(),

      // Table config
      columns: z.array(tableColumnSchema).optional(),
      rows: z
        .array(z.record(z.string(), z.union([z.string(), z.number()])))
        .optional(),

      // Confirmation config
      message: z.string().optional(),
      confirmLabel: z.string().optional(),
      cancelLabel: z.string().optional(),
      destructive: z.boolean().optional(),
    })
    .describe("Configuration for the UI component"),
});
export type ShowUIInput = z.infer<typeof showUIInputSchema>;

export const showUIOutputSchema = z.object({
  rendered: z.boolean(),
  awaitingInput: z.boolean().optional(),
  componentId: z.string().optional(),
  // User response will be populated when user interacts
  userResponse: z
    .object({
      selectedIds: z.array(z.string()).optional(),
      confirmed: z.boolean().optional(),
    })
    .optional(),
});
export type ShowUIOutput = z.infer<typeof showUIOutputSchema>;

// ============================================================================
// Persisted Tool Calls
// ============================================================================

const searchDataToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("searchData"),
  input: searchDataInputSchema,
  output: searchDataOutputSchema,
});

const modifyDataToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("modifyData"),
  input: modifyDataToolInputSchema,
  output: modifyDataOutputSchema,
});

const showUIToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("showUI"),
  input: showUIInputSchema,
  output: showUIOutputSchema,
});

export const persistedToolCallSchema = z.discriminatedUnion("name", [
  searchDataToolCallSchema,
  modifyDataToolCallSchema,
  showUIToolCallSchema,
]);

export type PersistedToolCall = z.infer<typeof persistedToolCallSchema>;

// Partial output update schema - for updating specific fields in tool call outputs
// Used by updateToolCallOutput mutation to modify persisted state (e.g., user confirmation)
export const persistedToolCallOutputUpdateSchema = z.object({
  // showUI output updates
  userResponse: z
    .object({
      selectedIds: z.array(z.string()).optional(),
      confirmed: z.boolean().optional(),
    })
    .optional(),
  awaitingInput: z.boolean().optional(),
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
  searchData: tool({
    description:
      "Search user data: shopping lists, items, expenses, members, debts, or groups. Always specify groupId.",
    inputSchema: searchDataInputSchema,
    outputSchema: searchDataOutputSchema,
  }),
  modifyData: tool({
    description:
      "Create, update, or delete: shopping list items, expenses, shopping lists, or groups. Use confirmations for destructive actions.",
    inputSchema: modifyDataToolInputSchema,
    outputSchema: modifyDataOutputSchema,
  }),
  showUI: tool({
    description:
      "Display interactive UI: selectors for choices, quizzes for questions, charts for visualization, tables for data, or confirmations for destructive actions.",
    inputSchema: showUIInputSchema,
    outputSchema: showUIOutputSchema,
  }),
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof chatTools>;

export type ChatUIMessage = AIUIMessage<MessageMetadata, never, ChatTools>;
