import type { CustomerInfo } from "react-native-purchases";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "../api";

export function usePurchaseEligibility() {
  const { data: usageData, isLoading: usageLoading } = useQuery(
    trpc.user.getUsage.queryOptions(),
  );
  const [rcCustomerInfo, setRcCustomerInfo] = useState<CustomerInfo | null>(
    null,
  );
  const [rcLoading, setRcLoading] = useState(Platform.OS === "ios");

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    async function fetchRCInfo() {
      try {
        const info = await Purchases.getCustomerInfo();
        setRcCustomerInfo(info);
      } catch (error) {
        console.error("Failed to fetch RevenueCat customer info:", error);
      } finally {
        setRcLoading(false);
      }
    }
    void fetchRCInfo();
  }, []);

  const hasMobilePlan =
    Object.keys(rcCustomerInfo?.entitlements.active ?? {}).length > 0;
  const mobilePlanName =
    Object.keys(rcCustomerInfo?.entitlements.active ?? {})[0] ?? null;

  const hasCredits = (usageData?.credits?.balance ?? 0) > 0;
  const canPurchaseMobile = !hasMobilePlan;

  return {
    canPurchaseMobile,
    hasMobilePlan,
    hasCredits,
    planName: mobilePlanName,
    managementURL: rcCustomerInfo?.managementURL,
    isLoading: usageLoading || rcLoading,
    creditBalance: usageData?.credits?.balance ?? 0,
  };
}
