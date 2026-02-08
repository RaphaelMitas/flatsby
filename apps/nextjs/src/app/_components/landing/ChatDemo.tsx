"use client";

import type { ModifyDataOutput } from "@flatsby/validators/chat/tools";
import { CornerDownLeft } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  Message,
  MessageContent,
} from "@flatsby/ui/ai-elements";
import { Card } from "@flatsby/ui/card";

import { ModifyDataResult } from "~/app/chat/_components/tool-results/modify-data-result";

interface DemoMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const demoMessages: DemoMessage[] = [
  {
    id: 1,
    role: "user",
    content: "Add milk and bread to the shopping list",
  },
  {
    id: 2,
    role: "assistant",
    content: "Done! I've added those items to your shopping list.",
  },
];

const demoToolResult: ModifyDataOutput = {
  success: true,
  action: "create",
  entity: "shoppingListItem",
  result: {
    id: 1,
    name: "Milk",
    categoryId: "dairy",
    completed: false,
  },
};

export function ChatDemo() {
  return (
    <Card className="bg-muted flex flex-col overflow-hidden p-0">
      <Conversation className="max-h-80 min-h-0">
        <ConversationContent className="p-4">
          {demoMessages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                <p className="whitespace-pre-wrap">{message.content}</p>
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
            Ask me anything...
          </span>
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
            <CornerDownLeft className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Card>
  );
}
