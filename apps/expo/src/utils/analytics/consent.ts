import type { AnalyticsConsent } from "@flatsby/validators/user";
import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { ANALYTICS_CONSENT_VERSION } from "@flatsby/validators/user";

import { trpc } from "~/utils/api";
import { storedChoice } from "~/utils/stored-choice";

const CHOICES = ["none", "screens", "recordings", "both"] as const;
type ConsentChoice = (typeof CHOICES)[number];

/** § 25 TDDDG attaches consent to the device, so it lives here and not on the account */
export const consentChoice = storedChoice(
  "analytics_consent",
  (saved): ConsentChoice =>
    CHOICES.find((choice) => choice === saved) ?? "none",
);

export const useAnalyticsConsent = () =>
  consentOf(consentChoice.useValue() ?? "none");

export const consentOf = (choice: ConsentChoice): AnalyticsConsent => ({
  screens: choice === "screens" || choice === "both",
  recordings: choice === "recordings" || choice === "both",
});

const choiceOf = ({ screens, recordings }: AnalyticsConsent): ConsentChoice =>
  screens
    ? recordings
      ? "both"
      : "screens"
    : recordings
      ? "recordings"
      : "none";

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

  return (next: AnalyticsConsent) => {
    consentChoice.save(choiceOf(next));
    log.mutate({
      ...next,
      version: ANALYTICS_CONSENT_VERSION,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
  };
}
