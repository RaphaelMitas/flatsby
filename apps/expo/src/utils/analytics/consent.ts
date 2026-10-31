import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { ANALYTICS_CONSENT_VERSION } from "@flatsby/validators/user";

import { trpc } from "~/utils/api";
import { storedChoice } from "~/utils/stored-choice";

/** § 25 TDDDG attaches consent to the device, so it lives here and not on the account */
export const consentChoice = storedChoice(
  "analytics_consent",
  // Builds with screen recordings also saved "both" and "recordings"; recordings alone never covered screens
  (saved) => (saved === "screens" || saved === "both" ? "screens" : "none"),
);

export const useAnalyticsConsent = () => consentChoice.useValue() === "screens";

const PROMPTS = ["unknown", "notice", "invite", "done"] as const;

/** The one-time Home row: the change notice for installs from before consent, then the invitation */
export const analyticsPrompt = storedChoice(
  "analytics_prompt",
  (saved): (typeof PROMPTS)[number] =>
    PROMPTS.find((prompt) => prompt === saved) ?? "unknown",
);

export function useSaveAnalyticsConsent() {
  // The record proves consent, so a flaky request gets more than one try
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
