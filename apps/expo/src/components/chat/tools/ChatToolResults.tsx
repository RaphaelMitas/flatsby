import type {
  ChatUIMessage,
  GroupMemberInfo,
  PersistedToolCallOutputUpdate,
  ShoppingListInfo,
} from "@flatsby/validators/chat/tools";
import { memo } from "react";
import { Text, View } from "react-native";

import { ShoppingItemDisplay } from "~/components/shoppingList/ShoppingItemDisplay";
import Icon from "~/lib/ui/custom/icons/Icon";
import { ChatExpenseCard } from "./ChatExpenseCard";
import { DebtsCard } from "./DebtsCard";
import { ExpenseListCard } from "./ExpenseListCard";
import { MemberSelector } from "./MemberSelector";
import { ShoppingListItemsCard } from "./ShoppingListItemsCard";
import { ShoppingListSelector } from "./ShoppingListSelector";
import { ShoppingListToolCard } from "./ShoppingListToolCard";
import { SplitEditorSheet } from "./SplitEditorSheet";
import { ToolErrorDisplay } from "./ToolErrorDisplay";

interface ChatToolResultsProps {
  message: ChatUIMessage;
  conversationId: string;
  isLoading: boolean;
  groupId?: number;
  onShoppingListSelect: (list: ShoppingListInfo) => void;
  onMemberSelect: (member: GroupMemberInfo) => void;
  updateToolCallOutput: (
    messageId: string,
    toolCallId: string,
    outputUpdate: PersistedToolCallOutputUpdate,
  ) => void;
}

function _ChatToolResults({
  message,
  conversationId,
  isLoading,
  groupId,
  onShoppingListSelect,
  onMemberSelect,
  updateToolCallOutput,
}: ChatToolResultsProps) {
  // Extract tool results by type
  const addToListResults = message.parts.filter(
    (part) =>
      part.type === "tool-addToShoppingList" &&
      part.state === "output-available",
  );

  const getListsResults = message.parts.filter(
    (part) =>
      part.type === "tool-getShoppingLists" &&
      part.state === "output-available",
  );

  const getItemsResults = message.parts.filter(
    (part) =>
      part.type === "tool-getShoppingListItems" &&
      part.state === "output-available",
  );

  const markCompleteResults = message.parts.filter(
    (part) =>
      part.type === "tool-markItemComplete" &&
      part.state === "output-available",
  );

  const removeItemResults = message.parts.filter(
    (part) =>
      part.type === "tool-removeItem" && part.state === "output-available",
  );

  const getGroupMembersResults = message.parts.filter(
    (part) =>
      part.type === "tool-getGroupMembers" && part.state === "output-available",
  );

  const getDebtsResults = message.parts.filter(
    (part) =>
      part.type === "tool-getDebts" && part.state === "output-available",
  );

  const addExpenseResults = message.parts.filter(
    (part) =>
      part.type === "tool-addExpense" && part.state === "output-available",
  );

  const getExpensesResults = message.parts.filter(
    (part) =>
      part.type === "tool-getExpenses" && part.state === "output-available",
  );

  return (
    <View className="mt-2 gap-2">
      {/* Shopping List: Add items result */}
      {addToListResults.map((part) => (
        <ShoppingListToolCard key={part.toolCallId} result={part.output} />
      ))}

      {/* Shopping List: List selector */}
      {getListsResults.map((part) => {
        if (!part.output.userShouldSelect) return null;
        return (
          <ShoppingListSelector
            key={part.toolCallId}
            lists={part.output.lists}
            onSelect={onShoppingListSelect}
            disabled={isLoading}
          />
        );
      })}

      {/* Shopping List: Items display */}
      {getItemsResults.map((part) => (
        <ShoppingListItemsCard
          key={part.toolCallId}
          listName={part.output.listName}
          items={part.output.items}
          totalCount={part.output.totalCount}
          shoppingListId={part.input.shoppingListId}
        />
      ))}

      {/* Shopping List: Mark complete result */}
      {markCompleteResults.map((part) => (
        <View key={part.toolCallId}>
          {part.output.success ? (
            <ShoppingItemDisplay
              name={part.output.itemName}
              completed={part.output.completed}
              categoryId={null}
            />
          ) : part.output.error ? (
            <ToolErrorDisplay error={part.output.error} />
          ) : null}
        </View>
      ))}

      {/* Shopping List: Remove item result */}
      {removeItemResults.map((part) => (
        <View key={part.toolCallId}>
          {part.output.success ? (
            <ShoppingItemDisplay
              name={part.output.removedItemName}
              completed={true}
              categoryId={null}
            />
          ) : part.output.error ? (
            <ToolErrorDisplay error={part.output.error} />
          ) : null}
        </View>
      ))}

      {/* Expense: Member selector */}
      {getGroupMembersResults.map((part) => {
        if (!part.output.userShouldSelect) return null;
        return (
          <MemberSelector
            key={part.toolCallId}
            members={part.output.members}
            context={part.output.context}
            onSelect={onMemberSelect}
            disabled={isLoading}
          />
        );
      })}

      {/* Expense: Debts display */}
      {getDebtsResults.map((part) => (
        <DebtsCard
          key={part.toolCallId}
          debts={part.output.debts}
          groupName={part.output.groupName}
        />
      ))}

      {/* Expense: Add expense result */}
      {addExpenseResults.map((part) => {
        if (
          part.output.success &&
          part.output.userShouldConfirmSplits &&
          part.output.pendingExpense
        ) {
          const dbMessageId = message.metadata?.dbMessageId;
          if (!dbMessageId) {
            return (
              <View
                key={part.toolCallId}
                className="flex-row items-center gap-2"
              >
                <Icon name="circle-alert" size={16} color="muted-foreground" />
                <Text className="text-muted-foreground text-sm">
                  Reload to confirm this expense
                </Text>
              </View>
            );
          }
          if (!groupId) {
            return (
              <ToolErrorDisplay
                key={part.toolCallId}
                error="Enable expense tools to confirm"
              />
            );
          }
          return (
            <SplitEditorSheet
              key={part.toolCallId}
              pendingExpense={part.output.pendingExpense}
              groupId={groupId}
              conversationId={conversationId}
              messageId={message.id}
              dbMessageId={dbMessageId}
              toolCallId={part.toolCallId}
              updateToolCallOutput={updateToolCallOutput}
              disabled={isLoading}
            />
          );
        }

        if (part.output.success && part.output.expenseId) {
          return (
            <ChatExpenseCard
              key={part.toolCallId}
              expenseId={part.output.expenseId}
            />
          );
        }

        if (part.output.error) {
          return (
            <ToolErrorDisplay key={part.toolCallId} error={part.output.error} />
          );
        }

        return null;
      })}

      {/* Expense: List expenses */}
      {getExpensesResults.map((part) => (
        <ExpenseListCard
          key={part.toolCallId}
          expenses={part.output.expenses}
          groupName={part.output.groupName}
        />
      ))}
    </View>
  );
}

export const ChatToolResults = memo(_ChatToolResults);
