import type { LanguageModelUsage, ModelMessage, Tool } from "ai";
import { captureAiGeneration } from "@posthog/ai";
import { gateway, generateText, stepCountIs, streamText } from "ai";

import { DEFAULT_CHAT_MODEL } from "@flatsby/validators/models";

import { posthog } from "../lib/posthog";

type ProviderOptions = NonNullable<
  Parameters<typeof streamText>[0]["providerOptions"]
>;

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

export function getGatewayModel(modelName: string) {
  return gateway(modelName);
}

export type TracingFeature =
  "chat" | "title-generation" | "categorize-item" | "categorize-expense";

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

interface CaptureGenerationArgs {
  tracing: TracingOptions | undefined;
  model: string;
  input: unknown;
  output: unknown;
  latencySeconds: number;
  usage?: LanguageModelUsage;
  error?: unknown;
}

// @posthog/ai's withTracing wrapper does not support the LanguageModelV4
// interface used by AI SDK 7 gateway models, so generations are captured
// through its lower-level captureAiGeneration primitive instead.
export function captureGeneration({
  tracing,
  model,
  input,
  output,
  latencySeconds,
  usage,
  error,
}: CaptureGenerationArgs) {
  if (!posthog || !tracing) return;
  void captureAiGeneration(posthog, {
    distinctId: tracing.distinctId,
    traceId: tracing.traceId,
    provider: "gateway",
    model,
    input,
    output,
    latency: latencySeconds,
    privacyMode: true,
    properties: { feature: tracing.feature, $ai_framework: "vercel" },
    ...(usage
      ? {
          usage: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            reasoningTokens: usage.outputTokenDetails.reasoningTokens,
            cacheReadInputTokens: usage.inputTokenDetails.cacheReadTokens,
            cacheCreationInputTokens: usage.inputTokenDetails.cacheWriteTokens,
          },
        }
      : {}),
    ...(error !== undefined ? { error } : {}),
  });
}

export function streamChatCompletion(
  messages: ModelMessage[],
  options: StreamChatOptions = {},
) {
  const modelName = options.model ?? DEFAULT_CHAT_MODEL;
  const startTime = Date.now();

  const result = streamText({
    model: gateway(modelName),
    messages,
    allowSystemInMessages: true,
    providerOptions: options.providerOptions ?? CHAT_PROVIDER_OPTIONS,
    onEnd: (event) => {
      captureGeneration({
        tracing: options.tracing,
        model: modelName,
        input: messages,
        output: event.text,
        usage: event.usage,
        latencySeconds: (Date.now() - startTime) / 1000,
      });
    },
    onError: ({ error }) => {
      captureGeneration({
        tracing: options.tracing,
        model: modelName,
        input: messages,
        output: null,
        error,
        latencySeconds: (Date.now() - startTime) / 1000,
      });
    },
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
  const startTime = Date.now();

  const result = streamText({
    model: gateway(modelName),
    system: options.systemPrompt,
    messages,
    allowSystemInMessages: true,
    tools: options.tools,
    stopWhen: stepCountIs(maxSteps),
    providerOptions: options.providerOptions ?? CHAT_PROVIDER_OPTIONS,
    onEnd: (event) => {
      captureGeneration({
        tracing: options.tracing,
        model: modelName,
        input: messages,
        output: event.text,
        usage: event.usage,
        latencySeconds: (Date.now() - startTime) / 1000,
      });
    },
    onError: ({ error }) => {
      captureGeneration({
        tracing: options.tracing,
        model: modelName,
        input: messages,
        output: null,
        error,
        latencySeconds: (Date.now() - startTime) / 1000,
      });
    },
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
  const startTime = Date.now();
  const systemPrompt =
    "Generate a short, concise title (max 6 words) for a conversation that starts with the following message. Return only the title, no quotes or punctuation at the end.";

  try {
    const result = await generateText({
      model: gateway(TITLE_GENERATION_MODEL),
      providerOptions: CHEAP_AI_PROVIDER_OPTIONS,
      system: systemPrompt,
      prompt: userMessage,
    });

    captureGeneration({
      tracing,
      model: TITLE_GENERATION_MODEL,
      input: userMessage,
      output: result.text,
      usage: result.usage,
      latencySeconds: (Date.now() - startTime) / 1000,
    });

    // Clean up and truncate the title
    const title = result.text.trim().slice(0, 100);
    return title || "New Chat";
  } catch (error) {
    captureGeneration({
      tracing,
      model: TITLE_GENERATION_MODEL,
      input: userMessage,
      output: null,
      error,
      latencySeconds: (Date.now() - startTime) / 1000,
    });
    throw error;
  }
}
