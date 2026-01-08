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
              <PromptInputButton
                className={cn(
                  settings.shoppingListToolsEnabled &&
                    "bg-accent text-accent-foreground",
                )}
                onClick={() =>
                  onSettingsChange({
                    shoppingListToolsEnabled: !settings.shoppingListToolsEnabled,
                  })
                }
                disabled={disabled || isLoading}
              >
                <ShoppingCart className="size-4" />
              </PromptInputButton>
              <PromptInputButton
                className={cn(
                  settings.expenseToolsEnabled &&
                    "bg-accent text-accent-foreground",
                )}
                onClick={() =>
                  onSettingsChange({
                    expenseToolsEnabled: !settings.expenseToolsEnabled,
                  })
                }
                disabled={disabled || isLoading}
              >
                <Wallet className="size-4" />
              </PromptInputButton>
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
