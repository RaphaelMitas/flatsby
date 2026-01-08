import { z } from "zod/v4";

// Available AI models
export const chatModelSchema = z.enum([
  "google/gemini-2.0-flash",
  "openai/gpt-4o",
  "openai/gpt-5.2",
]);
export type ChatModel = z.infer<typeof chatModelSchema>;

export const CHAT_MODELS = [
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
  },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "openai" },
] as const satisfies readonly {
  id: ChatModel;
  name: string;
  provider: string;
}[];
