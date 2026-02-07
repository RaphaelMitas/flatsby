import { useEffect } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import { useSession } from "../auth/auth-client";

export function RevenueCatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSession();
  const userId = session.data?.user.id;

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (!userId) return;

    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    if (!apiKey) {
      console.warn("RevenueCat API key not configured");
      return;
    }

    if (__DEV__) {
      void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({
      apiKey,
      appUserID: userId,
    });
  }, [userId]);

  return <>{children}</>;
}
