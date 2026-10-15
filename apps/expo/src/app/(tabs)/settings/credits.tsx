import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { formatCredits } from "@flatsby/validators/billing";

import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";
import { usePurchaseEligibility } from "~/utils/revenuecat/use-purchase-eligibility";

export default function CreditsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("billing");
  const locale = useLocale();
  const {
    canPurchaseMobile,
    hasWebPlan,
    hasApplePlan,
    planName,
    isLoading,
    creditBalance,
  } = usePurchaseEligibility();

  const credits = {
    count: creditBalance,
    credits: formatCredits(creditBalance, locale),
  };

  if (Platform.OS !== "ios") {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground mb-4 text-center text-xl font-bold">
          {t("mobile.notAvailable")}
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          {t("mobile.iosOnly")}
        </Text>
        <Button
          title={t("mobile.openWebsite")}
          onPress={() => Linking.openURL(`${getBaseUrl()}/billing`)}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasWebPlan) {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground mb-4 text-center text-xl font-bold">
          {t("mobile.planActive", { plan: planName })}
        </Text>
        <Text className="text-muted-foreground mb-2 text-center">
          {t("mobile.creditsRemaining", credits)}
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          {t("mobile.manageOnWebHint")}
        </Text>
        <Button
          title={t("mobile.manageOnWeb")}
          onPress={() => Linking.openURL(`${getBaseUrl()}/billing`)}
        />
      </View>
    );
  }

  if (hasApplePlan) {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground mb-4 text-center text-xl font-bold">
          {t("mobile.planActive", { plan: planName })}
        </Text>
        <Text className="text-muted-foreground mb-2 text-center">
          {t("mobile.creditsRemaining", credits)}
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          {t("mobile.manageOnDeviceHint")}
        </Text>
        <Button
          title={t("manageSubscription")}
          onPress={async () => {
            const info = await Purchases.getCustomerInfo();
            const url =
              info.managementURL ??
              "https://apps.apple.com/account/subscriptions";
            void Linking.openURL(url);
          }}
        />
      </View>
    );
  }

  if (!canPurchaseMobile) {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground mb-4 text-center text-xl font-bold">
          {t("mobile.creditsAvailable")}
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          {t("mobile.creditsAvailableDescription", credits)}
        </Text>
        <Button title={t("mobile.goBack")} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <RevenueCatUI.Paywall
        onDismiss={() => router.back()}
        onPurchaseCompleted={() => {
          void queryClient.invalidateQueries({
            queryKey: trpc.user.getUsage.queryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.user.getSubscription.queryKey(),
          });
          router.back();
        }}
        onRestoreCompleted={() => {
          void queryClient.invalidateQueries({
            queryKey: trpc.user.getUsage.queryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.user.getSubscription.queryKey(),
          });
        }}
      />
    </View>
  );
}
