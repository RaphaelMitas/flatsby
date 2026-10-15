import type { ModifyDataOutput } from "@flatsby/validators/chat/tools";
import { CornerDownLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Conversation,
  ConversationContent,
} from "@flatsby/ui/ai-elements/conversation";
import { Message, MessageContent } from "@flatsby/ui/ai-elements/message";
import { Card } from "@flatsby/ui/card";

import { ModifyDataResult } from "~/app/(app)/chat/_components/tool-results/modify-data-result";

const demoMessages = [
  { id: 1, role: "user", content: "chatRequest" },
  { id: 2, role: "assistant", content: "chatReply" },
] as const;

export function ChatDemo() {
  const t = useTranslations("marketing.demo");
  const demoToolResult: ModifyDataOutput = {
    success: true,
    action: "create",
    entity: "shoppingListItem",
    result: {
      id: 1,
      name: t("milk"),
      categoryId: "dairy",
      completed: false,
    },
  };

  return (
    <Card className="bg-muted flex flex-col overflow-hidden p-0">
      <Conversation className="max-h-80 min-h-0">
        <ConversationContent className="p-4">
          {demoMessages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                <p className="whitespace-pre-wrap">{t(message.content)}</p>
                {message.role === "assistant" && (
                  <ModifyDataResult output={demoToolResult} />
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
      </Conversation>
      <div className="border-t p-3">
        <div className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-muted-foreground flex-1 text-sm">
            {t("chatPlaceholder")}
          </span>
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
            <CornerDownLeft className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Card>
  );
}
