import { z } from "zod/v4";

export const chatModelSchema = z.enum([
  "openai/gpt-5.2",
  "openai/gpt-5-mini",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.6",
  "google/gemini-3-flash",
  "google/gemini-2.5-flash",
]);
export type ChatModel = z.infer<typeof chatModelSchema>;

export const CHAT_MODELS = [
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 0.15, output: 0.6 },
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 1.75, output: 14.0 },
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    supportsTools: true,
    pricing: { input: 3.0, output: 15.0 },
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    supportsTools: true,
    pricing: { input: 5.0, output: 25.0 },
  },
  {
    id: "google/gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "google",
    supportsTools: true,
    pricing: { input: 0.5, output: 2.8 },
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    supportsTools: false,
    pricing: { input: 0.5, output: 2.8 },
  },
] as const satisfies readonly {
  id: ChatModel;
  name: string;
  provider: string;
  supportsTools: boolean;
  pricing: { input: number; output: number };
}[];

export function getModelTier(modelId: string): "Fast" | "Balanced" | "Premium" {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  if (!model) return "Fast";
  const avgCost = (model.pricing.input + model.pricing.output) / 2;
  if (avgCost < 2) return "Fast";
  if (avgCost < 12) return "Balanced";
  return "Premium";
}

export function modelSupportsTools(modelId: string): boolean {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.supportsTools ?? false;
}
