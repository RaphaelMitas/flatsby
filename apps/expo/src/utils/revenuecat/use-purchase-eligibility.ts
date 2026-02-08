import type { CustomerInfo } from "react-native-purchases";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useQuery } from "@tanstack/react-query";

import { PLAN_IDS } from "@flatsby/validators/billing";

import { trpc } from "../api";

export function usePurchaseEligibility() {
  const { data: usageData, isLoading: usageLoading } = useQuery(
    trpc.user.getUsage.queryOptions(),
  );
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery(
    trpc.user.getSubscription.queryOptions(),
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

  const hasRCEntitlement =
    Object.keys(rcCustomerInfo?.entitlements.active ?? {}).length > 0;

  const autumnPlanId = subscriptionData?.planId ?? PLAN_IDS.FREE;
  const hasWebPlan =
    autumnPlanId === PLAN_IDS.STARTER || autumnPlanId === PLAN_IDS.PRO;
  const hasApplePlan = autumnPlanId === PLAN_IDS.PRO_APPLE || hasRCEntitlement;
  const hasPaidPlan = autumnPlanId !== PLAN_IDS.FREE;

  const hasCredits = (usageData?.credits?.balance ?? 0) > 0;
  const canPurchaseMobile = !hasPaidPlan;

  return {
    canPurchaseMobile,
    hasWebPlan,
    hasApplePlan,
    hasPaidPlan,
    hasCredits,
    planId: autumnPlanId,
    planName: subscriptionData?.planName ?? "Free",
    managementURL: rcCustomerInfo?.managementURL,
    isLoading: usageLoading || subscriptionLoading || rcLoading,
    creditBalance: usageData?.credits?.balance ?? 0,
  };
}
