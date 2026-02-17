export const CURRENT_AI_CONSENT_VERSION = "1.1";

export const AI_DATA_DISCLOSURE = {
  sharingStatement:
    "This feature shares your data with third-party AI services.",
  providers: [
    { name: "OpenAI", description: "Processes chat messages using GPT models" },
    {
      name: "Anthropic",
      description: "Processes chat messages using Claude models",
    },
    {
      name: "Google",
      description: "Processes chat messages using Gemini models",
    },
  ],
  gateway: "Vercel AI Gateway",
  gatewayDescription: "Routes your data to the AI providers listed above",
  dataShared: [
    "Your chat messages and conversation history",
    "Shopping list names and items (when you ask about shopping)",
    "Expense descriptions and amounts (when you ask about expenses)",
    "Group member names (when you ask about your household)",
  ],
  notShared: [
    "Your email address or account credentials",
    "Payment information",
  ],
  usage:
    "Your data is shared solely to generate AI responses. It is not used to train AI models.",
  permissionRequest:
    "Do you consent to sharing your data with these third-party AI services?",
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
