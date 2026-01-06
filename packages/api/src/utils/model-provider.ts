import { streamText } from "ai";

import type { ContextMessage } from "./context-builder";

// Default model using Vercel AI Gateway format: provider/model
const DEFAULT_MODEL = "google/gemini-2.0-flash";

/**
 * Get the default model name
 */
export function getDefaultModel() {
  return DEFAULT_MODEL;
}

export interface StreamChatOptions {
  model?: string;
  systemPrompt?: string;
}

/**
 * Stream a chat completion via Vercel AI Gateway
 * Uses the AI_GATEWAY_API_KEY environment variable for authentication
 * Model format: provider/model (e.g., "google/gemini-2.0-flash", "openai/gpt-4o")
 * Returns an async iterable of text chunks
 */
export function streamChatCompletion(
  messages: ContextMessage[],
  options: StreamChatOptions = {},
): AsyncIterable<string> {
  const modelName = options.model ?? DEFAULT_MODEL;

  const result = streamText({
    // AI SDK v5: string model ID uses Vercel AI Gateway by default
    model: modelName,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Return the text stream as an async iterable
  return result.textStream;
}
