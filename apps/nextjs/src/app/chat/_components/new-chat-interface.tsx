"use client";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type { ChatSettings } from "@flatsby/validators/chat/messages";
import type { ChatModel } from "@flatsby/validators/models";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquareIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@flatsby/ui/ai-elements";
import { CHAT_MODELS } from "@flatsby/validators/models";

import { useTRPC } from "~/trpc/react";
import { ChatFooter } from "./chat-footer";

const DEFAULT_SETTINGS: ChatSettings = {
  toolsEnabled: false,
};

interface NewChatInterfaceProps {
  defaultModel?: ChatModel;
}

export function NewChatInterface({ defaultModel }: NewChatInterfaceProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<ChatModel>(
    defaultModel ?? CHAT_MODELS[0].id,
  );
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);

  const createConversation = useMutation(
    trpc.chat.createConversation.mutationOptions({}),
  );

  const isLoading = createConversation.isPending;

  const onFormSubmit = (
    _message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    createConversation.mutate(
      { model: selectedModel },
      {
        onSuccess: (conversation) => {
          void queryClient.invalidateQueries({
            queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
          });
          router.push(
            `/chat/${conversation.id}?message=${encodeURIComponent(message)}`,
          );
        },
      },
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          <ConversationEmptyState
            title="Start a conversation"
            description="Ask me anything and I'll help you out"
            icon={<MessageSquareIcon className="size-8" />}
          />
        </ConversationContent>
      </Conversation>

      <ChatFooter
        input={input}
        onInputChange={setInput}
        onSubmit={onFormSubmit}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        settings={settings}
        onSettingsChange={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        status={isLoading ? "submitted" : "ready"}
        error={createConversation.error?.message}
      />
    </div>
  );
}
