import { useEffect } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import { useSession } from "../auth/auth-client";
import { isE2EBuild } from "../e2e-config";

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

    const apiKey = String(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "");
    if (!apiKey) throw new Error("EXPO_PUBLIC_REVENUECAT_API_KEY is not set");

    if (__DEV__) {
      void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    if (!isE2EBuild()) {
      Purchases.configure({
        apiKey,
        appUserID: userId,
      });
    }
  }, [userId]);

  return <>{children}</>;
}
