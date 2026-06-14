import type { ModelMessage, ProviderOptions, Tool } from "ai";
import { withTracing } from "@posthog/ai";
import { gateway, generateText, stepCountIs, streamText } from "ai";

import { posthog } from "../lib/posthog";

export const DEFAULT_CHAT_MODEL = "openai/gpt-5.4-mini";
export const CHEAP_AI_MODEL = "openai/gpt-5.4-nano";

const CHAT_PROVIDER_OPTIONS = {
  openai: {
    reasoningEffort: "none",
  },
  google: {
    thinkingConfig: {
      thinkingLevel: "low",
    },
  },
} as const satisfies ProviderOptions;

export const CHEAP_AI_PROVIDER_OPTIONS = {
  openai: {
    reasoningEffort: "none",
  },
} as const satisfies ProviderOptions;

const TITLE_GENERATION_MODEL = CHEAP_AI_MODEL;

export function getDefaultModel() {
  return DEFAULT_CHAT_MODEL;
}

export type TracingFeature =
  | "chat"
  | "title-generation"
  | "categorize-item"
  | "categorize-expense";

export interface TracingOptions {
  distinctId: string;
  traceId: string;
  feature: TracingFeature;
}

export interface StreamChatOptions {
  model?: string;
  systemPrompt?: string;
  tracing?: TracingOptions;
  providerOptions?: ProviderOptions;
}

export interface StreamChatWithToolsOptions extends StreamChatOptions {
  tools?: Record<string, Tool>;
  maxSteps?: number;
}

export function createTracedModel(modelName: string, tracing?: TracingOptions) {
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
  const modelName = options.model ?? DEFAULT_CHAT_MODEL;
  const model = createTracedModel(modelName, options.tracing);

  const result = streamText({
    model,
    messages,
    providerOptions: options.providerOptions ?? CHAT_PROVIDER_OPTIONS,
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
  const modelName = options.model ?? DEFAULT_CHAT_MODEL;
  const maxSteps = options.maxSteps ?? 5;
  const model = createTracedModel(modelName, options.tracing);

  const result = streamText({
    model,
    system: options.systemPrompt,
    messages,
    tools: options.tools,
    stopWhen: stepCountIs(maxSteps),
    providerOptions: options.providerOptions ?? CHAT_PROVIDER_OPTIONS,
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
    providerOptions: CHEAP_AI_PROVIDER_OPTIONS,
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
