import { useEffect } from "react";
import { usePostHog } from "posthog-react-native";

import { useSession } from "~/utils/auth/auth-client";

export function usePostHogIdentify() {
  const posthog = usePostHog();
  const session = useSession();

  useEffect(() => {
    if (posthog.optedOut) return;
    if (session.data?.user) {
      posthog.identify(session.data.user.id, {
        email: session.data.user.email,
        name: session.data.user.name,
      });
    }
  }, [session.data?.user, posthog]);
}
