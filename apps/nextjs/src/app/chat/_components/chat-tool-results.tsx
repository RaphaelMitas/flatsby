"use client";

import type {
  ChatUIMessage,
  GroupMemberInfo,
  PersistedToolCallOutputUpdate,
  ShoppingListInfo,
} from "@flatsby/validators/chat/tools";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  List,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { OptimisticShoppingListItem } from "~/app/shopping-list/[shoppingListId]/ShoppingListItem";
import { ChatExpenseCard } from "./chat-expense-card";
import { MemberSelector } from "./member-selector";
import { ShoppingListSelector } from "./shopping-list-selector";
import { ShoppingListToolCard } from "./shopping-list-tool-card";
import { SplitEditorSelector } from "./split-editor-selector";

interface ChatToolResultsProps {
  message: ChatUIMessage;
  conversationId: string;
  isLastMessage: boolean;
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

export function ChatToolResults({
  message,
  conversationId,
  isLastMessage,
  isLoading,
  groupId,
  onShoppingListSelect,
  onMemberSelect,
  updateToolCallOutput,
}: ChatToolResultsProps) {
  // Extract tool results for shopping list
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
    <>
      {addToListResults.map((part) => (
        <ShoppingListToolCard key={part.toolCallId} result={part.output} />
      ))}

      {getListsResults.map((part) => {
        if (!part.output.userShouldSelect) return null;
        return (
          <ShoppingListSelector
            key={part.toolCallId}
            lists={part.output.lists}
            onSelect={onShoppingListSelect}
            disabled={isLoading || !isLastMessage}
          />
        );
      })}

      {getItemsResults.map((part) => {
        return (
          <Card key={part.toolCallId} className="my-2 max-w-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <List className="size-4" />
                <Link
                  href={`/shopping-list/${part.input.shoppingListId}`}
                  className="hover:underline"
                >
                  {part.output.listName}
                </Link>
                <span className="text-muted-foreground font-normal">
                  ({part.output.totalCount} items)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 space-y-2 overflow-y-auto pt-0">
              {part.output.items.map((item) => (
                <OptimisticShoppingListItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  completed={item.completed}
                  categoryId={item.categoryId}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {markCompleteResults.map((part) => (
        <div key={part.toolCallId} className="my-2">
          {part.output.success ? (
            <div className="max-w-sm">
              <OptimisticShoppingListItem
                id={0}
                name={part.output.itemName}
                completed={part.output.completed}
                categoryId={null}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="text-destructive size-4" />
              <span className="text-destructive">{part.output.error}</span>
            </div>
          )}
        </div>
      ))}

      {removeItemResults.map((part) => (
        <div
          key={part.toolCallId}
          className="my-1 flex items-center gap-2 text-sm"
        >
          {part.output.success ? (
            <>
              <CheckCircle2 className="size-4 text-green-500" />
              <span>Removed "{part.output.removedItemName}"</span>
            </>
          ) : (
            <>
              <AlertCircle className="text-destructive size-4" />
              <span className="text-destructive">{part.output.error}</span>
            </>
          )}
        </div>
      ))}

      {getGroupMembersResults.map((part) => {
        if (!part.output.userShouldSelect) return null;
        return (
          <MemberSelector
            key={part.toolCallId}
            members={part.output.members}
            context={part.output.context}
            onSelect={onMemberSelect}
            disabled={isLoading || !isLastMessage}
          />
        );
      })}

      {getDebtsResults.map((part) => (
        <Card key={part.toolCallId} className="my-2 max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="size-4" />
              Debts in {part.output.groupName}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {part.output.debts.length === 0 ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500" />
                All settled up!
              </div>
            ) : (
              <ul className="space-y-1">
                {part.output.debts.map((debt, i) => (
                  <li key={i} className="flex items-center gap-1 text-sm">
                    <span className="font-medium">{debt.fromMember}</span>
                    <ArrowRight className="text-muted-foreground size-3" />
                    <span className="font-medium">{debt.toMember}</span>
                    <span className="ml-auto">
                      {formatCurrencyFromCents({
                        cents: debt.amountInCents,
                        currency: debt.currency,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {addExpenseResults.map((part) => {
        if (
          part.output.success &&
          part.output.userShouldConfirmSplits &&
          part.output.pendingExpense
        ) {
          // Need database message ID (UUID) for tool call updates
          const dbMessageId = message.metadata?.dbMessageId;
          if (!dbMessageId) {
            return (
              <div
                key={part.toolCallId}
                className="my-1 flex items-center gap-2 text-sm"
              >
                <AlertCircle className="text-muted-foreground size-4" />
                <span className="text-muted-foreground">
                  Reload page to confirm this expense
                </span>
              </div>
            );
          }
          if (!groupId) {
            return (
              <div
                key={part.toolCallId}
                className="my-1 flex items-center gap-2 text-sm"
              >
                <AlertCircle className="text-destructive size-4" />
                <span className="text-destructive">
                  Please enable expense tools to confirm this expense
                </span>
              </div>
            );
          }
          return (
            <SplitEditorSelector
              key={part.toolCallId}
              pendingExpense={part.output.pendingExpense}
              groupId={groupId}
              conversationId={conversationId}
              messageId={message.id}
              dbMessageId={dbMessageId}
              toolCallId={part.toolCallId}
              updateToolCallOutput={updateToolCallOutput}
              disabled={isLoading || !isLastMessage}
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
            <div
              key={part.toolCallId}
              className="my-1 flex items-center gap-2 text-sm"
            >
              <AlertCircle className="text-destructive size-4" />
              <span className="text-destructive">{part.output.error}</span>
            </div>
          );
        }
      })}

      {getExpensesResults.map((part) => (
        <div key={part.toolCallId} className="my-2 space-y-2">
          <p className="text-muted-foreground text-sm">
            Recent Expenses in {part.output.groupName}
          </p>
          {part.output.expenses.map((expense) => (
            <ChatExpenseCard key={expense.id} expenseId={expense.id} />
          ))}
        </div>
      ))}
    </>
  );
}
