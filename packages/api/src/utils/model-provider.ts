import type { ModelMessage, Tool } from "ai";
import { gateway, generateText, stepCountIs, streamText } from "ai";
import { withTracing } from "@posthog/ai";

import { posthog } from "../lib/posthog";

const DEFAULT_MODEL = "openai/gpt-5.2";
const TITLE_GENERATION_MODEL = "openai/gpt-5.2";

export function getDefaultModel() {
  return DEFAULT_MODEL;
}

export type TracingFeature = "chat" | "title-generation" | "categorize-item";

export interface TracingOptions {
  distinctId: string;
  traceId: string;
  feature: TracingFeature;
}

export interface StreamChatOptions {
  model?: string;
  systemPrompt?: string;
  tracing?: TracingOptions;
}

export interface StreamChatWithToolsOptions extends StreamChatOptions {
  tools?: Record<string, Tool>;
  maxSteps?: number;
}

export function createTracedModel(
  modelName: string,
  tracing?: TracingOptions,
) {
  const baseModel = gateway(modelName);
  if (!posthog || !tracing) return baseModel;
  return withTracing(baseModel, posthog, {
    posthogDistinctId: tracing.distinctId,
    posthogTraceId: tracing.traceId,
    posthogPrivacyMode: true,
    posthogProperties: { feature: tracing.feature },
  });
}

export function streamChatCompletion(
  messages: ModelMessage[],
  options: StreamChatOptions = {},
) {
  const modelName = options.model ?? DEFAULT_MODEL;
  const model = createTracedModel(modelName, options.tracing);

  const result = streamText({
    model,
    messages,
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
  messages: ModelMessage[],
  options: StreamChatWithToolsOptions = {},
) {
  const modelName = options.model ?? DEFAULT_MODEL;
  const maxSteps = options.maxSteps ?? 5;
  const model = createTracedModel(modelName, options.tracing);

  const result = streamText({
    model,
    system: options.systemPrompt,
    messages,
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
 */
export async function generateConversationTitle(
  userMessage: string,
  tracing?: TracingOptions,
): Promise<string> {
  const model = createTracedModel(TITLE_GENERATION_MODEL, tracing);

  const result = await generateText({
    model,
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
