import { z } from "zod/v4";

export const chatModelSchema = z.enum([
  "openai/gpt-6-luna",
  "openai/gpt-6.1-sol",
  "openai/gpt-6-astra",
  "google/gemini-3.5-flash-lite",
  "google/gemini-3.8-flash",
  "google/gemini-4-argon",
]);
export type ChatModel = z.infer<typeof chatModelSchema>;
export const DEFAULT_CHAT_MODEL = "openai/gpt-6-luna" satisfies ChatModel;

interface ChatModelDefinition {
  id: ChatModel;
  name: string;
  provider: string;
  supportsTools: boolean;
  pricing: { input: number; output: number };
}

export const CHAT_MODELS: readonly ChatModelDefinition[] = [
  {
    id: "openai/gpt-6-luna",
    name: "GPT-6 Luna",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 0.1, output: 0.5 },
  },
  {
    id: "openai/gpt-6.1-sol",
    name: "GPT-6.1 Sol",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 2.0, output: 10.0 },
  },
  {
    id: "openai/gpt-6-astra",
    name: "GPT-6 Astra",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 10.0, output: 50.0 },
  },
  {
    id: "google/gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite", // i18n-ignore
    provider: "google",
    supportsTools: true,
    pricing: { input: 0.3, output: 2.5 },
  },
  {
    id: "google/gemini-3.8-flash",
    name: "Gemini 3.8 Flash", // i18n-ignore
    provider: "google",
    supportsTools: true,
    pricing: { input: 0.75, output: 3.75 },
  },
  {
    id: "google/gemini-4-argon",
    name: "Gemini 4 Argon", // i18n-ignore
    provider: "google",
    supportsTools: true,
    pricing: { input: 2.0, output: 10.0 },
  },
];

export function getModelTier(modelId: string): "fast" | "balanced" | "premium" {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  if (!model) return "fast";
  const avgCost = (model.pricing.input + model.pricing.output) / 2;
  if (avgCost < 2) return "fast";
  if (avgCost < 12) return "balanced";
  return "premium";
}

export function modelSupportsTools(modelId: string): boolean {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.supportsTools ?? false;
}
