import { z } from "zod/v4";

// Available AI models
export const chatModelSchema = z.enum(["openai/gpt-5.2"]);
export type ChatModel = z.infer<typeof chatModelSchema>;

export const CHAT_MODELS = [
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    supportsTools: true,
  },
] as const satisfies readonly {
  id: ChatModel;
  name: string;
  provider: string;
  supportsTools: boolean;
}[];

/**
 * Check if a model supports tools
 */
export function modelSupportsTools(modelId: string): boolean {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.supportsTools ?? false;
}
