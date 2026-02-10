"use client";

import type { ChatModel } from "@flatsby/validators/models";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquareIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@flatsby/ui/ai-elements";
import { CHAT_MODELS } from "@flatsby/validators/models";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { ChatFooter } from "./chat-footer";
import { useToolPreferences } from "./useToolPreferences";

interface NewChatInterfaceProps {
  defaultModel?: ChatModel;
}

export function NewChatInterface({ defaultModel }: NewChatInterfaceProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { currentGroup } = useGroupContext();

  const [selectedModel, setSelectedModel] = useState<ChatModel>(
    defaultModel ?? CHAT_MODELS[0].id,
  );

  const { updateToolPreferences, toolPreferences } = useToolPreferences();

  const createConversation = useMutation(
    trpc.chat.createConversation.mutationOptions({}),
  );

  const isLoading = createConversation.isPending;

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || createConversation.isPending) return;
      createConversation.mutate(
        { model: selectedModel },
        {
          onSuccess: (conversation) => {
            void queryClient.invalidateQueries({
              queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
            });
            router.push(
              `/chat/${conversation.id}?message=${encodeURIComponent(text)}`,
            );
          },
        },
      );
    },
    [
      createConversation,
      queryClient,
      trpc.chat.getUserConversations,
      router,
      selectedModel,
    ],
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
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
        sendMessage={sendMessage}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        toolPreferences={toolPreferences}
        onToolPreferencesChange={updateToolPreferences}
        status={isLoading ? "submitted" : "ready"}
        error={createConversation.error?.message}
        hasGroup={!!currentGroup}
      />
    </div>
  );
}
