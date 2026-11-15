import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { ANALYTICS_CONSENT_VERSION } from "@flatsby/validators/user";

import { trpc } from "~/utils/api";
import { storedChoice } from "~/utils/stored-choice";

export const consentChoice = storedChoice("analytics_consent", (saved) =>
  saved === "screens" || saved === "both" ? "screens" : "none",
);

export const useAnalyticsConsent = () => consentChoice.useValue() === "screens";

const PROMPTS = ["unknown", "notice", "invite", "done"] as const;

export const analyticsPrompt = storedChoice(
  "analytics_prompt",
  (saved): (typeof PROMPTS)[number] =>
    PROMPTS.find((prompt) => prompt === saved) ?? "unknown",
);

export function useSaveAnalyticsConsent() {
  const log = useMutation(
    trpc.user.logAnalyticsConsent.mutationOptions({ retry: 3 }),
  );

  return (screens: boolean) => {
    consentChoice.save(screens ? "screens" : "none");
    log.mutate({
      screens,
      version: ANALYTICS_CONSENT_VERSION,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
  };
}
