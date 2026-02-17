import type {
  SendTrigger,
  ToolPreferences,
} from "@flatsby/validators/chat/messages";
import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import type { ChatTransport, UIMessageChunk } from "ai";

/**
 * Chunk yielded by the streaming tRPC mutation
 */
export interface StreamChunk {
  type: "text-delta" | "finish" | "tool-call" | "tool-result";
  textDelta?: string;
  content?: string;
  status?: "pending" | "streaming" | "complete" | "error";
  // Finish chunk includes metadata for immediate UI update
  messageId?: string;
  model?: ChatModel | null;
  cost?: number | null;
  // Tool-specific fields
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
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
    model?: ChatModel;
    toolPreferences?: ToolPreferences;
    groupId?: number;
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
function getMessageContent(message: ChatUIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export interface TRPCChatTransportOptions {
  sendMutation: SendMutationFn;
  getModel?: () => ChatModel | undefined;
  getToolPreferences?: () => ToolPreferences | undefined;
  getGroupId?: () => number | undefined;
}

/**
 * Creates a tRPC chat transport compatible with @ai-sdk/react's useChat hook.
 * Implements the UI Message Stream Protocol.
 */
export function createTRPCChatTransport({
  sendMutation,
  getModel,
  getToolPreferences,
  getGroupId,
}: TRPCChatTransportOptions): ChatTransport<ChatUIMessage> {
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
          model: getModel?.(),
          toolPreferences: getToolPreferences?.(),
          groupId: getGroupId?.(),
        },
        { signal: options.abortSignal },
      );

      let textBlockId = `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const iterator = result[Symbol.asyncIterator]();
      let sentStart = false;
      let sentTextStart = false;
      let textStarted = false;
      let pendingTextDelta: string | undefined;

      const generateNewTextBlockId = () => {
        textBlockId = `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      };

      return new ReadableStream<UIMessageChunk>({
        async pull(controller) {
          try {
            if (!sentStart) {
              controller.enqueue({ type: "start" });
              sentStart = true;
              return;
            }

            // Send pending text delta from previous pull (after text-start was sent)
            if (pendingTextDelta !== undefined) {
              controller.enqueue({
                type: "text-delta",
                id: textBlockId,
                delta: pendingTextDelta,
              });
              pendingTextDelta = undefined;
              return;
            }

            const iterResult = await iterator.next();

            if (iterResult.done) {
              // End text block if it was started
              if (textStarted) {
                controller.enqueue({ type: "text-end", id: textBlockId });
              }
              controller.enqueue({ type: "finish", finishReason: "stop" });
              controller.close();
              return;
            }

            const chunk: StreamChunk = iterResult.value;

            if (chunk.type === "text-delta" && chunk.textDelta) {
              // Start text block on first text delta - must return to ensure it's processed first
              if (!sentTextStart) {
                controller.enqueue({ type: "text-start", id: textBlockId });
                sentTextStart = true;
                textStarted = true;
                // Store the pending delta to send on next pull
                pendingTextDelta = chunk.textDelta;
                return;
              }
              controller.enqueue({
                type: "text-delta",
                id: textBlockId,
                delta: chunk.textDelta,
              });
            } else if (chunk.type === "tool-call") {
              // End text block if active before tool call
              if (textStarted && sentTextStart) {
                controller.enqueue({ type: "text-end", id: textBlockId });
                textStarted = false;
                sentTextStart = false; // Reset so next text gets a new text-start
                generateNewTextBlockId(); // New ID for next text block
              }
              // Emit tool input available chunk (UI Message Stream Protocol name for tool-call)
              controller.enqueue({
                type: "tool-input-available",
                toolCallId: chunk.toolCallId ?? "",
                toolName: chunk.toolName ?? "",
                input: chunk.args ?? {},
              });
            } else if (chunk.type === "tool-result") {
              // Emit tool output available chunk (UI Message Stream Protocol name for tool-result)
              controller.enqueue({
                type: "tool-output-available",
                toolCallId: chunk.toolCallId ?? "",
                output: chunk.result,
              });
            } else if (chunk.type === "finish") {
              // End text block if active
              if (textStarted) {
                controller.enqueue({ type: "text-end", id: textBlockId });
                textStarted = false;
              }
              controller.enqueue({
                type: "message-metadata",
                messageMetadata: {
                  model: chunk.model,
                  cost: chunk.cost,
                  dbMessageId: chunk.messageId, // DB message ID for tool call updates
                },
              });
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
