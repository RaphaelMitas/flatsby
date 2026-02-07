import { Pressable, ScrollView, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AI_DATA_DISCLOSURE,
  CURRENT_AI_CONSENT_VERSION,
} from "@flatsby/validators/ai-consent";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";

interface AIConsentScreenProps {
  onConsent: () => void;
  onDecline: () => void;
}

export function AIConsentScreen({
  onConsent,
  onDecline,
}: AIConsentScreenProps) {
  const queryClient = useQueryClient();

  const updateConsent = useMutation(
    trpc.user.updateAIConsent.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.user.getAIConsentStatus.queryKey(),
        });
        onConsent();
      },
    }),
  );

  const handleAccept = () => {
    updateConsent.mutate({
      accepted: true,
      version: CURRENT_AI_CONSENT_VERSION,
    });
  };

  const openPrivacyPolicy = () => {
    void Linking.openURL("https://flat-cove.io/legal/privacy");
  };

  return (
    <ScrollView className="bg-background flex-1">
      <View className="flex-1 p-6">
        <View className="mb-6 items-center">
          <View className="bg-primary/10 mb-4 h-16 w-16 items-center justify-center rounded-full">
            <Icon name="shield" size={32} color="primary" />
          </View>
          <Text className="text-foreground text-center text-2xl font-bold">
            AI Data Sharing
          </Text>
          <Text className="text-muted-foreground mt-2 text-center">
            Before using the AI assistant, please review how your data is used.
          </Text>
        </View>

        <View className="bg-card border-border mb-4 rounded-lg border p-4">
          <View className="mb-3 flex-row items-center">
            <Icon name="sparkles" size={20} color="muted-foreground" />
            <Text className="text-foreground ml-2 font-semibold">
              AI Providers
            </Text>
          </View>
          <Text className="text-muted-foreground">
            Your messages are processed by{" "}
            {AI_DATA_DISCLOSURE.providers.join(", ")} via{" "}
            {AI_DATA_DISCLOSURE.gateway} to generate responses.
          </Text>
        </View>

        <View className="bg-card border-border mb-4 rounded-lg border p-4">
          <View className="mb-3 flex-row items-center">
            <Icon name="check" size={20} color="muted-foreground" />
            <Text className="text-muted-foreground ml-2 font-semibold">
              Data Shared
            </Text>
          </View>
          {AI_DATA_DISCLOSURE.dataShared.map((item, index) => (
            <View key={index} className="mb-2 flex-row items-start">
              <View className="bg-primary/20 mt-0.5 mr-2 rounded-full p-1">
                <Icon name="check" size={12} color="primary" />
              </View>
              <Text className="text-muted-foreground flex-1">{item}</Text>
            </View>
          ))}
        </View>

        <View className="bg-card border-border mb-4 rounded-lg border p-4">
          <View className="mb-3 flex-row items-center">
            <Icon name="shield-off" size={20} color="muted-foreground" />
            <Text className="text-foreground ml-2 font-semibold">
              Data NOT Shared
            </Text>
          </View>
          {AI_DATA_DISCLOSURE.notShared.map((item, index) => (
            <View key={index} className="mb-2 flex-row items-start">
              <View className="bg-destructive/20 mt-0.5 mr-2 rounded-full p-1">
                <Icon name="x" size={12} color="destructive" />
              </View>
              <Text className="text-muted-foreground flex-1">{item}</Text>
            </View>
          ))}
        </View>

        <View className="bg-muted/50 border-border mb-6 rounded-lg border p-4">
          <View className="flex-row items-start">
            <Icon name="info" size={20} color="muted-foreground" />
            <Text className="text-muted-foreground ml-2 flex-1">
              {AI_DATA_DISCLOSURE.usage}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Button
            title="Accept & Continue"
            onPress={handleAccept}
            disabled={updateConsent.isPending}
          />
          <Button
            title="Decline"
            variant="outline"
            onPress={onDecline}
            disabled={updateConsent.isPending}
          />
        </View>

        <Pressable onPress={openPrivacyPolicy} className="mt-4">
          <Text className="text-primary text-center underline">
            View full Privacy Policy
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
