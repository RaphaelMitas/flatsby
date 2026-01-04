import type { SendTrigger } from "@flatsby/validators/chat";
import type { UIMessage } from "ai";

/**
 * Input for the send mutation
 */
export interface SendInput {
  conversationId: string;
  message: UIMessage;
  trigger: SendTrigger;
  messageId?: string;
}

/**
 * Chunk yielded by the streaming mutation
 */
export interface StreamChunk {
  type: "text-delta" | "finish";
  textDelta?: string;
  content?: string;
  status?: "pending" | "streaming" | "complete" | "error";
}

/**
 * UI Message chunk format expected by AI SDK useChat
 */
export interface UIMessageChunk {
  type: "text-delta" | "finish";
  textDelta?: string;
}

/**
 * Options passed to sendMessages by useChat
 */
export interface SendMessagesOptions {
  chatId: string;
  messages: UIMessage[];
  trigger: SendTrigger;
  messageId?: string;
  abortSignal?: AbortSignal;
}

/**
 * Type for the tRPC send mutation function
 */
export type SendMutationFn = (
  input: SendInput,
  opts?: { signal?: AbortSignal },
) => Promise<AsyncIterable<StreamChunk>>;

/**
 * Chat transport interface compatible with AI SDK
 */
export interface ChatTransport {
  sendMessages(
    opts: SendMessagesOptions,
  ): Promise<ReadableStream<UIMessageChunk>>;
  reconnectToStream(opts: { chatId: string }): ReadableStream<UIMessageChunk>;
}

/**
 * Creates a tRPC chat transport compatible with @ai-sdk/react's useChat hook.
 *
 * This transport:
 * - Calls the single `chat.send` mutation which handles message insertion and streaming
 * - Converts AsyncIterable from tRPC to ReadableStream for AI SDK
 * - Works on both Next.js and Expo
 *
 * @example
 * ```typescript
 * import { useChat } from "@ai-sdk/react";
 * import { createTRPCChatTransport } from "@flatsby/ui/chat-transport";
 *
 * const transport = createTRPCChatTransport(trpc.chat.send.mutate);
 * const chat = useChat({
 *   transport,
 *   id: conversationId,
 *   onFinish: () => utils.chat.getConversation.invalidate({ conversationId }),
 * });
 * ```
 */
export function createTRPCChatTransport(
  sendMutation: SendMutationFn,
): ChatTransport {
  return {
    async sendMessages(opts: SendMessagesOptions) {
      const message = opts.messages.at(-1);
      if (!message) {
        throw new Error("No message to send");
      }

      const result = await sendMutation(
        {
          conversationId: opts.chatId,
          message,
          trigger: opts.trigger,
          messageId:
            opts.trigger === "regenerate-message" ? opts.messageId : undefined,
        },
        { signal: opts.abortSignal },
      );

      // Convert AsyncIterable → ReadableStream
      const iterator = result[Symbol.asyncIterator]();

      return new ReadableStream<UIMessageChunk>({
        async pull(controller) {
          try {
            const { done, value } = await iterator.next();
            if (done) {
              controller.close();
              return;
            }

            // Map StreamChunk to UIMessageChunk
            if (value.type === "text-delta" && value.textDelta) {
              controller.enqueue({
                type: "text-delta",
                textDelta: value.textDelta,
              });
            } else if (value.type === "finish") {
              controller.enqueue({
                type: "finish",
              });
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

    /**
     * Reconnect to stream is not needed since recovery is handled by
     * fetching the conversation from the database via getConversation.
     * Returns an empty stream that closes immediately.
     */
    reconnectToStream() {
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          controller.close();
        },
      });
    },
  };
}
