"use client";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type { ChatSettings } from "@flatsby/validators/chat/messages";
import type { ChatModel } from "@flatsby/validators/models";
import type { FormEvent } from "react";
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

import { ChatModelSelector } from "./chat-model-selector";

type PromptStatus = "ready" | "submitted" | "streaming" | "error";

interface ChatFooterProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void;
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
  settings: ChatSettings;
  onSettingsChange: (settings: Partial<ChatSettings>) => void;
  status: PromptStatus;
  disabled?: boolean;
  error?: string | null;
}

export function ChatFooter({
  input,
  onInputChange,
  onSubmit,
  selectedModel,
  onModelChange,
  settings,
  onSettingsChange,
  status,
  disabled = false,
  error,
}: ChatFooterProps) {
  const isLoading = status === "submitted" || status === "streaming";
  const toolsSupported = selectedModel ? modelSupportsTools(selectedModel) : false;

  return (
    <>
      {error && (
        <div className="border-destructive bg-destructive/10 text-destructive mx-4 mb-2 rounded-lg border p-3 text-sm">
          {error}
        </div>
      )}

      <div className="shrink-0 border-t p-4">
        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type your message..."
            disabled={disabled || isLoading}
          />
          <PromptInputFooter>
            <div className="flex items-center gap-1">
              <ChatModelSelector
                currentModel={selectedModel}
                onModelChange={onModelChange}
                disabled={disabled || isLoading}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <PromptInputButton
                      className={cn(
                        settings.shoppingListToolsEnabled &&
                          toolsSupported &&
                          "bg-accent text-accent-foreground",
                      )}
                      onClick={() =>
                        onSettingsChange({
                          shoppingListToolsEnabled:
                            !settings.shoppingListToolsEnabled,
                        })
                      }
                      disabled={disabled || isLoading || !toolsSupported}
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
                        settings.expenseToolsEnabled &&
                          toolsSupported &&
                          "bg-accent text-accent-foreground",
                      )}
                      onClick={() =>
                        onSettingsChange({
                          expenseToolsEnabled: !settings.expenseToolsEnabled,
                        })
                      }
                      disabled={disabled || isLoading || !toolsSupported}
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
            <PromptInputSubmit
              status={status}
              disabled={!input.trim() || disabled || isLoading}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
