import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  analyticsPrompt,
  consentChoice,
  consentOf,
} from "~/utils/analytics/consent";
import {
  applyConsent,
  deletePostHogFiles,
  readLegacyPostHogFile,
  storesDeviceId,
  usePostHogClient,
} from "~/utils/analytics/posthog";
import { trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";

export function AnalyticsSync() {
  const choice = consentChoice.useValue();
  const prompt = analyticsPrompt.useValue();
  const session = useSession();
  const userId = session.data?.user.id;
  const client = usePostHogClient();
  const { mutateAsync: setOptOut } = useMutation(
    trpc.user.setAnalyticsOptOut.mutationOptions(),
  );

  useEffect(() => {
    if (choice !== null) void applyConsent(consentOf(choice));
  }, [choice]);

  useEffect(() => {
    if (userId && choice !== null && storesDeviceId(consentOf(choice)))
      client.identify(userId);
  }, [client, userId, choice]);

  // Once per install: earlier builds stored an ID, and maybe the old opt-out, without asking
  useEffect(() => {
    if (prompt !== "unknown" || choice !== "none" || session.isPending) return;
    void (async () => {
      const legacy = await readLegacyPostHogFile();
      if (legacy.optedOut && userId) {
        // A failed save keeps the file, so the next launch tries again
        const result = await setOptOut({ optOut: true }).catch(() => null);
        if (!result?.success) return;
      }
      deletePostHogFiles();
      analyticsPrompt.save(
        legacy.optedOut ? "done" : legacy.existed ? "notice" : "invite",
      );
    })();
  }, [prompt, choice, session.isPending, userId, setOptOut]);

  return null;
}
