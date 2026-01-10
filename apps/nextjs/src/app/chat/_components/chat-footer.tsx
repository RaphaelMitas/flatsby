"use client";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type { ChatModel } from "@flatsby/validators/models";
import type { FormEvent } from "react";
import { memo, useState } from "react";
import { ShoppingCart, Wallet } from "lucide-react";

import { cn } from "@flatsby/ui";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@flatsby/ui/ai-elements";
import { Tooltip, TooltipContent, TooltipTrigger } from "@flatsby/ui/tooltip";
import { modelSupportsTools } from "@flatsby/validators/models";

import type { UseToolPreferencesResult } from "./useToolPreferences";
import { ChatModelSelector } from "./chat-model-selector";

type PromptStatus = "ready" | "submitted" | "streaming" | "error";

interface ChatFooterProps {
  sendMessage: (text: string) => void;
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
  toolPreferences: UseToolPreferencesResult["toolPreferences"];
  onToolPreferencesChange: UseToolPreferencesResult["updateToolPreferences"];
  status: PromptStatus;
  disabled?: boolean;
  error?: string | null;
}

const ChatToolbar = memo(function ChatToolbar({
  selectedModel,
  onModelChange,
  toolPreferences,
  onToolPreferencesChange,
  disabled,
  isLoading,
}: Pick<
  ChatFooterProps,
  | "selectedModel"
  | "onModelChange"
  | "toolPreferences"
  | "onToolPreferencesChange"
  | "disabled"
> & {
  isLoading: boolean;
}) {
  const toolsSupported = selectedModel
    ? modelSupportsTools(selectedModel)
    : false;

  return (
    <div className="flex items-center gap-1">
      <ChatModelSelector
        currentModel={selectedModel}
        onModelChange={onModelChange}
        disabled={disabled ?? isLoading}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <PromptInputButton
              className={cn(
                toolPreferences.shoppingListToolsEnabled &&
                  toolsSupported &&
                  "bg-accent text-accent-foreground",
              )}
              onClick={() =>
                onToolPreferencesChange({
                  shoppingListToolsEnabled:
                    !toolPreferences.shoppingListToolsEnabled,
                })
              }
              disabled={(disabled ?? isLoading) || !toolsSupported}
            >
              <ShoppingCart className="size-4" />
            </PromptInputButton>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {toolsSupported
            ? "Shopping list tools"
            : "Shopping list tools: Not supported by this model"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <PromptInputButton
              className={cn(
                toolPreferences.expenseToolsEnabled &&
                  toolsSupported &&
                  "bg-accent text-accent-foreground",
              )}
              onClick={() =>
                onToolPreferencesChange({
                  expenseToolsEnabled: !toolPreferences.expenseToolsEnabled,
                })
              }
              disabled={(disabled ?? isLoading) || !toolsSupported}
            >
              <Wallet className="size-4" />
            </PromptInputButton>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {toolsSupported
            ? "Expense tools"
            : "Expense tools: Not supported by this model"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

export const ChatFooter = ({
  sendMessage,
  selectedModel,
  onModelChange,
  toolPreferences,
  onToolPreferencesChange,
  status,
  disabled = false,
  error,
}: ChatFooterProps) => {
  const [input, setInput] = useState("");

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (
    _message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <>
      {error && (
        <div className="border-destructive bg-destructive/10 text-destructive mx-4 mb-2 rounded-lg border p-3 text-sm">
          {error}
        </div>
      )}

      <div className="shrink-0 border-t p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={disabled || isLoading}
          />
          <PromptInputFooter>
            <ChatToolbar
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              toolPreferences={toolPreferences}
              onToolPreferencesChange={onToolPreferencesChange}
              disabled={disabled}
              isLoading={isLoading}
            />
            <PromptInputSubmit
              status={status}
              disabled={!input.trim() || disabled || isLoading}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
};
