import { z } from "zod/v4";

export const chatModelSchema = z.enum([
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4",
  "openai/gpt-5.5",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3-flash",
]);
export type ChatModel = z.infer<typeof chatModelSchema>;

export const CHAT_MODELS = [
  {
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 0.75, output: 4.5 },
  },
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 2.5, output: 15.0 },
  },
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
    supportsTools: true,
    pricing: { input: 5.0, output: 30.0 },
  },
  {
    id: "google/gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "google",
    supportsTools: true,
    pricing: { input: 0.25, output: 1.5 },
  },
  {
    id: "google/gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "google",
    supportsTools: true,
    pricing: { input: 0.5, output: 3.0 },
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
