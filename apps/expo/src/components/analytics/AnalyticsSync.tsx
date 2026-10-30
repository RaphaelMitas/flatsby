import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";

import {
  analyticsPrompt,
  consentChoice,
  consentOf,
} from "~/utils/analytics/consent";
import {
  applyConsent,
  getAnalyticsConsent,
  getPostHog,
  readLegacyPostHogFile,
  storesDeviceId,
} from "~/utils/analytics/posthog";
import { trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";

export function AnalyticsSync() {
  const choice = consentChoice.useValue();
  const prompt = analyticsPrompt.useValue();
  const session = useSession();
  const userId = session.data?.user.id;
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const { mutateAsync: setOptOut } = useMutation(
    trpc.user.setAnalyticsOptOut.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries(trpc.user.getCurrentUser.queryFilter()),
    }),
  );

  // Applying consent deletes the old SDK file, so it waits for the migration below to read it
  useEffect(() => {
    if (choice !== null && prompt !== null && prompt !== "unknown")
      void applyConsent(consentOf(choice));
  }, [choice, prompt]);

  useEffect(() => {
    // The render right after a swap still holds the retired client
    if (posthog !== getPostHog()) return;
    if (userId && storesDeviceId(getAnalyticsConsent()))
      posthog.identify(userId);
  }, [posthog, userId]);

  // Once per install: earlier builds stored an ID, and maybe the old opt-out, without asking
  useEffect(() => {
    if (prompt !== "unknown" || session.isPending) return;
    void (async () => {
      const legacy = await readLegacyPostHogFile();
      if (legacy.optedOut) {
        // The file, and with it the objection, stays until it is saved to an account
        if (!userId) return;
        const result = await setOptOut({ optOut: true }).catch(() => null);
        if (!result?.success) return;
      }
      analyticsPrompt.save(
        legacy.optedOut ? "done" : legacy.existed ? "notice" : "invite",
      );
    })();
  }, [prompt, session.isPending, userId, setOptOut]);

  return null;
}
