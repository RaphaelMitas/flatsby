import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { formatCredits } from "@flatsby/validators/billing";

import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";
import { usePurchaseEligibility } from "~/utils/revenuecat/use-purchase-eligibility";

export default function CreditsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    canPurchaseMobile,
    hasWebPlan,
    hasApplePlan,
    planName,
    isLoading,
    creditBalance,
  } = usePurchaseEligibility();

  if (Platform.OS !== "ios") {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground mb-4 text-center text-xl font-bold">
          Not Available
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          In-app purchases are only available on iOS. Visit our website to
          manage your subscription.
        </Text>
        <Button
          title="Open Website"
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
          {planName} Active
        </Text>
        <Text className="text-muted-foreground mb-2 text-center">
          You have {formatCredits(creditBalance)} credits remaining.
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          Manage your subscription on the web.
        </Text>
        <Button
          title="Manage on Web"
          onPress={() => Linking.openURL(`${getBaseUrl()}/billing`)}
        />
      </View>
    );
  }

  if (hasApplePlan) {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground mb-4 text-center text-xl font-bold">
          {planName} Active
        </Text>
        <Text className="text-muted-foreground mb-2 text-center">
          You have {formatCredits(creditBalance)} credits remaining.
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          Manage your subscription in your device settings.
        </Text>
        <Button
          title="Manage Subscription"
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
          Credits Available
        </Text>
        <Text className="text-muted-foreground mb-6 text-center">
          You have {formatCredits(creditBalance)} credits. Manage your
          subscription on the web.
        </Text>
        <Button title="Go Back" onPress={() => router.back()} />
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
