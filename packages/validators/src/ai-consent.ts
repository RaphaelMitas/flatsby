import { msg } from "@flatsby/i18n/message-key";

export const CURRENT_AI_CONSENT_VERSION = "1.1";

export const AI_DATA_DISCLOSURE = {
  sharingStatement: msg("chat.consent.disclosure.sharingStatement"),
  providers: [
    {
      name: "OpenAI",
      description: msg("chat.consent.disclosure.openaiDescription"),
    },
    {
      name: "Google",
      description: msg("chat.consent.disclosure.googleDescription"),
    },
  ],
  gateway: "Vercel AI Gateway", // i18n-ignore
  gatewayDescription: msg("chat.consent.disclosure.gatewayDescription"),
  dataShared: [
    msg("chat.consent.disclosure.dataShared.messages"),
    msg("chat.consent.disclosure.dataShared.shoppingLists"),
    msg("chat.consent.disclosure.dataShared.expenses"),
    msg("chat.consent.disclosure.dataShared.members"),
  ],
  notShared: [
    msg("chat.consent.disclosure.notShared.credentials"),
    msg("chat.consent.disclosure.notShared.payment"),
  ],
  usage: msg("chat.consent.disclosure.usage"),
  permissionRequest: msg("chat.consent.disclosure.permissionRequest"),
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
