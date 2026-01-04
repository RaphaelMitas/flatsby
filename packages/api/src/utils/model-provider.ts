import { streamText } from "ai";

import type { ContextMessage } from "./context-builder";

// Environment variable to select provider: "google" | "openai"
const MODEL_PROVIDER = process.env.MODEL_PROVIDER ?? "google";

// Default models per provider
const DEFAULT_MODELS = {
  google: "gemini-2.0-flash",
  openai: "gpt-4o",
} as const;

/**
 * Get the default model name for the current provider
 */
export function getDefaultModel() {
  if (MODEL_PROVIDER === "openai") {
    return DEFAULT_MODELS.openai;
  }
  return DEFAULT_MODELS.google;
}

export interface StreamChatOptions {
  model?: (typeof DEFAULT_MODELS)[keyof typeof DEFAULT_MODELS];
}

/**
 * Stream a chat completion from the configured AI provider
 * Returns an async iterable of text chunks
 */
export function streamChatCompletion(
  messages: ContextMessage[],
  options: StreamChatOptions = {},
): AsyncIterable<string> {
  const modelName = options.model ?? getDefaultModel();

  const result = streamText({
    model: modelName,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Return the text stream as an async iterable
  return result.textStream;
}

/**
 * Get the current model provider name
 */
export function getModelProviderName(): string {
  return MODEL_PROVIDER;
}
