import type {
  ModifyDataOutput,
  SearchDataOutput,
  ShowUIOutput,
} from "@flatsby/validators/chat/tools";
import type { Tool } from "ai";
import { tool, zodSchema } from "ai";

import {
  modifyDataInputSchema,
  modifyDataToolInputSchema,
  searchDataInputSchema,
  showUIInputSchema,
} from "@flatsby/validators/chat/tools";

import type { createTRPCContext } from "../trpc";
import { createRouterCaller } from "../root";
import {
  executeModifyData,
  executeSearchData,
  executeShowUI,
} from "./tool-executor";

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
 * System prompt for the 3 powerful agent tools
 */
const TOOLS_SYSTEM_PROMPT = `You have 3 tools to help users manage their household:

1. **searchData** - Query shopping lists, items, expenses, members, or debts
   - Always specify groupId (use the user's current group ID provided in context)
   - Use filters to narrow results (shoppingListId, includeCompleted, limit, dateRange, currency)
   - Query types: "shoppingLists", "shoppingListItems", "expenses", "groupMembers", "debts", "groups"
   - Set displayToUser: false for internal lookups (fetching member IDs, list IDs before modifying). Omit or set true when the user asked to see data.

2. **modifyData** - Create, update, or delete items/expenses/lists
   - Actions: "create", "update", "delete"
   - Entities: "shoppingListItem", "expense", "shoppingList", "group"
   - Use showUI confirmation before destructive delete operations
   - For expenses, specify paidByMemberId or currentUserPaid, and optionally custom splits

3. **showUI** - Show interactive UI to the user
   - Components:
     * "selector" - Let user choose from options (shopping lists, members, etc.)
     * "quiz" - Ask a question with choices
     * "chart" - Visualize data (pie, bar, line) for expenses, debts
     * "table" - Display structured data
     * "confirmation" - Confirm before destructive actions (set destructive: true for delete operations)
   - User selections automatically continue the conversation

WORKFLOW GUIDELINES:
- When user asks about something ambiguous (e.g., "add eggs"), use showUI selector to ask which shopping list
- For expense operations, use searchData with displayToUser: false to get groupMembers when you need member IDs
- Before delete operations, use showUI confirmation with destructive: true
- Use showUI chart to visualize expense breakdowns or debt summaries
- searchData results with displayToUser: true are shown in the UI - don't repeat that data in your response
- For searchData with displayToUser: false, briefly mention relevant findings in your text if the user needs context

SECURITY:
- All tools are scoped to the current group - you cannot access other groups
- The groupId is provided in context - always use it
- Member IDs must belong to the group

RESPONSE STYLE:
- Tool results are automatically displayed in the UI
- Keep your text responses brief (e.g., "Here are your items" or "Added to the list")
- Don't list out data that tools already display`;

/**
 * Returns the system prompt describing available tools
 */
export function buildToolsSystemPrompt(): string {
  return TOOLS_SYSTEM_PROMPT;
}

/**
 * Creates chat tools scoped to a specific group
 */
export function createChatTools({
  ctx,
  groupId,
}: {
  ctx: TRPCContext;
  groupId: number;
}): Record<string, Tool> {
  const caller = createRouterCaller(ctx);

  return {
    searchData: tool({
      description:
        "Search user data: shopping lists, items, expenses, group members, debts, or groups. Always specify groupId.",
      inputSchema: zodSchema(searchDataInputSchema),
      execute: async (input): Promise<SearchDataOutput> => {
        return executeSearchData(
          { db: ctx.db, userId: ctx.session.user.id, caller },
          { ...input, groupId },
        );
      },
    }),

    modifyData: tool({
      description:
        "Create, update, or delete: shopping list items, expenses, shopping lists, or groups. Use confirmations for destructive actions.",
      inputSchema: zodSchema(modifyDataToolInputSchema),
      execute: async (input): Promise<ModifyDataOutput> => {
        const parsed = modifyDataInputSchema.parse(input);
        return executeModifyData(
          { db: ctx.db, userId: ctx.session.user.id, caller },
          { ...parsed, groupId },
        );
      },
    }),

    showUI: tool({
      description:
        "Display interactive UI: selectors for choices, quizzes for questions, charts for visualization, tables for data, or confirmations for destructive actions.",
      inputSchema: zodSchema(showUIInputSchema),
      execute: (input): ShowUIOutput => {
        return executeShowUI(input);
      },
    }),
  };
}
