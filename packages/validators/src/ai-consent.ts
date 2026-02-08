export const CURRENT_AI_CONSENT_VERSION = "1.0";

export const AI_DATA_DISCLOSURE = {
  providers: ["OpenAI", "Anthropic", "Google"],
  gateway: "Vercel AI Gateway",
  dataShared: [
    "Your chat messages and conversation history",
    "Shopping list names and items (when using tools)",
    "Expense descriptions and amounts (when using tools)",
    "Group member names (when using tools)",
  ],
  notShared: [
    "Your email address or account credentials",
    "Payment information",
  ],
  usage:
    "Your data is used solely to generate responses. It is not used to train AI models.",
};

export function requiresAIConsent(user: {
  aiConsentAcceptedAt: Date | null;
  aiConsentVersion: string | null;
}): boolean {
  return (
    !user.aiConsentAcceptedAt ||
    user.aiConsentVersion !== CURRENT_AI_CONSENT_VERSION
  );
}
