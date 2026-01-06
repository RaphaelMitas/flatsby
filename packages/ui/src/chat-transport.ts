import type { SendTrigger } from "@flatsby/validators/chat";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

/**
 * Chunk yielded by the streaming tRPC mutation
 */
export interface StreamChunk {
  type: "text-delta" | "finish";
  textDelta?: string;
  content?: string;
  status?: "pending" | "streaming" | "complete" | "error";
}

/**
 * Valid message roles for tRPC
 */
type MessageRole = "user" | "assistant" | "system";

/**
 * Type for the tRPC send mutation function
 */
export type SendMutationFn = (
  input: {
    conversationId: string;
    message: {
      id: string;
      role: MessageRole;
      content: string;
      createdAt: Date;
    };
    trigger: SendTrigger;
    messageId?: string;
  },
  opts?: { signal?: AbortSignal },
) => Promise<AsyncIterable<StreamChunk>>;

/**
 * Validates and narrows a role string to MessageRole
 */
function validateRole(role: string): MessageRole {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  return "user";
}

/**
 * Extracts text content from message parts
 */
function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * Creates a tRPC chat transport compatible with @ai-sdk/react's useChat hook.
 * Implements the UI Message Stream Protocol.
 */
export function createTRPCChatTransport(
  sendMutation: SendMutationFn,
): ChatTransport<UIMessage> {
  return {
    sendMessages: async (options) => {
      const message = options.messages.at(-1);
      if (!message) {
        throw new Error("No message to send");
      }

      const result = await sendMutation(
        {
          conversationId: options.chatId,
          message: {
            id: message.id,
            role: validateRole(message.role),
            content: getMessageContent(message),
            createdAt: new Date(),
          },
          trigger: options.trigger,
          messageId:
            options.trigger === "regenerate-message"
              ? options.messageId
              : undefined,
        },
        { signal: options.abortSignal },
      );

      const textBlockId = `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const iterator = result[Symbol.asyncIterator]();
      let sentStart = false;
      let sentTextStart = false;

      return new ReadableStream<UIMessageChunk>({
        async pull(controller) {
          try {
            if (!sentStart) {
              controller.enqueue({ type: "start" });
              sentStart = true;
              return;
            }

            if (!sentTextStart) {
              controller.enqueue({ type: "text-start", id: textBlockId });
              sentTextStart = true;
              return;
            }

            const iterResult = await iterator.next();

            if (iterResult.done) {
              controller.enqueue({ type: "text-end", id: textBlockId });
              controller.enqueue({ type: "finish", finishReason: "stop" });
              controller.close();
              return;
            }

            const chunk: StreamChunk = iterResult.value;
            if (chunk.type === "text-delta" && chunk.textDelta) {
              controller.enqueue({
                type: "text-delta",
                id: textBlockId,
                delta: chunk.textDelta,
              });
            } else if (chunk.type === "finish") {
              controller.enqueue({ type: "text-end", id: textBlockId });
              controller.enqueue({ type: "finish", finishReason: "stop" });
              controller.close();
            }
          } catch (error) {
            controller.error(error);
          }
        },
        async cancel() {
          await iterator.return?.();
        },
      });
    },

    reconnectToStream: () => {
      return Promise.resolve(null);
    },
  };
}
