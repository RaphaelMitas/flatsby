import { useEffect } from "react";
import { usePostHog } from "posthog-react-native";

import { useSession } from "~/utils/auth/auth-client";

export function usePostHogIdentify() {
  const posthog = usePostHog();
  const session = useSession();
  const userId = session.data?.user.id;

  useEffect(() => {
    if (posthog.optedOut) return;
    if (!userId || !session.data?.user.email) return;

    // Apple leaves the name empty when the user doesn't share it
    const { email, name } = session.data.user;
    posthog.identify(userId, name ? { email, name } : { email });
    // only run once
  }, [userId]);
}
