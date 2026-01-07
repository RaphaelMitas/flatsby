"use client";

import type { ChatModel } from "@flatsby/validators/chat";
import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type { FormEvent } from "react";

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@flatsby/ui/ai-elements";

import { ChatModelSelector } from "./chat-model-selector";

type PromptStatus = "ready" | "submitted" | "streaming" | "error";

interface ChatFooterProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void;
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
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
            <ChatModelSelector
              currentModel={selectedModel}
              onModelChange={onModelChange}
              disabled={disabled || isLoading}
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
}
