import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

import { SafeAreaView } from "~/lib/ui/safe-area";
import { useAIConsent } from "~/utils/use-ai-consent";
import { AIConsentScreen } from "./AIConsentScreen";

interface AIConsentGateProps {
  children: ReactNode;
}

export function AIConsentGate({ children }: AIConsentGateProps) {
  const router = useRouter();
  const { hasConsent, isLoading, refetch } = useAIConsent();

  if (isLoading) {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasConsent) {
    return (
      <SafeAreaView>
        <AIConsentScreen
          onConsent={() => void refetch()}
          onDecline={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
