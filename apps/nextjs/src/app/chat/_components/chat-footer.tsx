"use client";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type { ChatModel } from "@flatsby/validators/models";
import type { FormEvent } from "react";
import { memo, useState } from "react";
import { InfoIcon, XIcon } from "lucide-react";

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@flatsby/ui/ai-elements";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";

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
  hasGroup?: boolean;
}

const ChatToolbar = ({
  selectedModel,
  onModelChange,
  toolPreferences,
  onToolPreferencesChange,
  disabled,
  isLoading,
  hasGroup,
}: Pick<
  ChatFooterProps,
  | "selectedModel"
  | "onModelChange"
  | "toolPreferences"
  | "onToolPreferencesChange"
  | "disabled"
  | "hasGroup"
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
        hasGroup={hasGroup}
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
  hasGroup = false,
  bannerDismissed,
  setBannerDismissed,
}: ChatFooterProps & {
  input: string;
  setInput: (input: string) => void;
  bannerDismissed: boolean;
  setBannerDismissed: (dismissed: boolean) => void;
}) => {
  const isLoading = status === "submitted" || status === "streaming";
  const showToolsBanner = !hasGroup && !bannerDismissed;

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

      <div className="flex shrink-0 flex-col gap-4 border-t p-4">
        {showToolsBanner && (
          <Alert variant="info" className="w-full">
            <InfoIcon className="size-4" />
            <div className="flex items-start justify-between">
              <div>
                <AlertTitle>Select a group to enable AI tools</AlertTitle>
                <AlertDescription>
                  Tools let AI manage your shopping lists and expenses
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBannerDismissed(true)}
              >
                <XIcon className="size-4" /> dismiss
              </Button>
            </div>
          </Alert>
        )}
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
              hasGroup={hasGroup}
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
  hasGroup = false,
}: ChatFooterProps) {
  const [input, setInput] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
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
      hasGroup={hasGroup}
      bannerDismissed={bannerDismissed}
      setBannerDismissed={setBannerDismissed}
    />
  );
});
