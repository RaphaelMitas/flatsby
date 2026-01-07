import type { Tool } from "ai";
import { generateText, stepCountIs, streamText } from "ai";

import type { ContextMessage } from "./context-builder";

// Default model using Vercel AI Gateway format: provider/model
const DEFAULT_MODEL = "google/gemini-2.0-flash";
// Always use Gemini Flash for title generation (fast and cost-effective)
const TITLE_GENERATION_MODEL = "google/gemini-2.0-flash";

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

export interface StreamChatWithToolsOptions extends StreamChatOptions {
  tools?: Record<string, Tool>;
  maxSteps?: number;
}

/**
 * Stream a chat completion via Vercel AI Gateway
 * Uses the AI_GATEWAY_API_KEY environment variable for authentication
 * Model format: provider/model (e.g., "google/gemini-2.0-flash", "openai/gpt-4o")
 * Returns the streaming result with text stream and metadata
 */
export function streamChatCompletion(
  messages: ContextMessage[],
  options: StreamChatOptions = {},
) {
  const modelName = options.model ?? DEFAULT_MODEL;

  const result = streamText({
    // AI SDK v5: string model ID uses Vercel AI Gateway by default
    model: modelName,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return {
    textStream: result.textStream,
    providerMetadata: result.providerMetadata,
    model: modelName,
  };
}

/**
 * Stream a chat completion with tool calling support
 * Returns the full stream which includes text-delta, tool-call, tool-result events
 */
export function streamChatWithTools(
  messages: ContextMessage[],
  options: StreamChatWithToolsOptions = {},
) {
  const modelName = options.model ?? DEFAULT_MODEL;
  const maxSteps = options.maxSteps ?? 5;

  const result = streamText({
    model: modelName,
    system: options.systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    tools: options.tools,
    stopWhen: stepCountIs(maxSteps),
  });

  return {
    fullStream: result.fullStream,
    providerMetadata: result.providerMetadata,
    model: modelName,
  };
}

/**
 * Generate a conversation title from the first user message
 * Always uses Gemini Flash for speed and cost efficiency
 */
export async function generateConversationTitle(
  userMessage: string,
): Promise<string> {
  const result = await generateText({
    model: TITLE_GENERATION_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Generate a short, concise title (max 6 words) for a conversation that starts with the following message. Return only the title, no quotes or punctuation at the end.",
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  // Clean up and truncate the title
  const title = result.text.trim().slice(0, 100);
  return title || "New Chat";
}
