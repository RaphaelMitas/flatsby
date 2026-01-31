"use client";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type { ChatModel } from "@flatsby/validators/models";
import type { FormEvent } from "react";
import { memo, useState } from "react";

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@flatsby/ui/ai-elements";

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

const ChatToolbar = ({
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
}) => {
  return (
    <div className="flex items-center gap-1">
      <ChatModelSelector
        currentModel={selectedModel}
        onModelChange={onModelChange}
        toolsEnabled={toolPreferences.toolsEnabled}
        onToolsChange={(enabled) =>
          onToolPreferencesChange({ toolsEnabled: enabled })
        }
        disabled={disabled ?? isLoading}
      />
    </div>
  );
};

const _ChatFooter = ({
  input,
  setInput,
  sendMessage,
  selectedModel,
  onModelChange,
  toolPreferences,
  onToolPreferencesChange,
  status,
  disabled = false,
  error,
}: ChatFooterProps & {
  input: string;
  setInput: (input: string) => void;
}) => {
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

export const ChatFooter = memo(function ChatFooter({
  sendMessage,
  selectedModel,
  onModelChange,
  toolPreferences,
  onToolPreferencesChange,
  status,
  disabled = false,
  error,
}: ChatFooterProps) {
  const [input, setInput] = useState("");
  return (
    <_ChatFooter
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      toolPreferences={toolPreferences}
      onToolPreferencesChange={onToolPreferencesChange}
      status={status}
      disabled={disabled}
      error={error}
    />
  );
});
