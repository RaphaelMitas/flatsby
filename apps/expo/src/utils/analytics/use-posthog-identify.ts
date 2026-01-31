import { useEffect } from "react";
import { usePostHog } from "posthog-react-native";

import { useSession } from "~/utils/auth/auth-client";

export function usePostHogIdentify() {
  const posthog = usePostHog();
  const session = useSession();
  const userId = session.data?.user.id;

  useEffect(() => {
    if (posthog.optedOut) return;
    if (!userId || !session.data?.user.email || !session.data.user.name) return;

    posthog.identify(userId, {
      email: session.data.user.email,
      name: session.data.user.name,
    });
    // only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
