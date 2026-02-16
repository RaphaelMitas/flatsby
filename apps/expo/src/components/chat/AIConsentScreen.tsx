import { Pressable, ScrollView, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AI_DATA_DISCLOSURE,
  CURRENT_AI_CONSENT_VERSION,
} from "@flatsby/validators/ai-consent";

import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
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
            Third-Party AI Data Sharing
          </Text>
          <Text className="text-muted-foreground mt-2 text-center">
            {AI_DATA_DISCLOSURE.sharingStatement}
          </Text>
        </View>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-2">
              <Icon name="sparkles" size={20} color="foreground" />
              <CardTitle>Your Data Will Be Shared With</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            {AI_DATA_DISCLOSURE.providers.map((provider, index) => (
              <View key={index} className="flex-row items-start gap-2">
                <View className="bg-primary/20 mt-0.5 rounded-full p-1">
                  <Icon name="check" size={12} color="primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">
                    {provider.name}
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    {provider.description}
                  </Text>
                </View>
              </View>
            ))}
            <View className="border-border mt-2 border-t pt-3">
              <Text className="text-muted-foreground text-sm">
                via {AI_DATA_DISCLOSURE.gateway}:{" "}
                {AI_DATA_DISCLOSURE.gatewayDescription}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-2">
              <Icon name="check" size={20} color="foreground" />
              <CardTitle>Data Shared With Third Parties</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-2">
            {AI_DATA_DISCLOSURE.dataShared.map((item, index) => (
              <View key={index} className="flex-row items-start gap-2">
                <View className="bg-primary/20 mt-0.5 rounded-full p-1">
                  <Icon name="check" size={12} color="primary" />
                </View>
                <Text className="text-muted-foreground flex-1 text-sm">
                  {item}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-2">
              <Icon name="shield-off" size={20} color="foreground" />
              <CardTitle>Data NOT Shared</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-2">
            {AI_DATA_DISCLOSURE.notShared.map((item, index) => (
              <View key={index} className="flex-row items-start gap-2">
                <View className="bg-destructive/20 mt-0.5 rounded-full p-1">
                  <Icon name="x" size={12} color="destructive" />
                </View>
                <Text className="text-muted-foreground flex-1 text-sm">
                  {item}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-2">
              <Icon name="info" size={20} color="foreground" />
              <CardTitle>How Your Data Is Used</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <Text className="text-muted-foreground text-sm">
              {AI_DATA_DISCLOSURE.usage}
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Text className="text-foreground text-center font-medium">
              {AI_DATA_DISCLOSURE.permissionRequest}
            </Text>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button
              title="Yes, I Consent"
              onPress={handleAccept}
              disabled={updateConsent.isPending}
              className="w-full"
            />
            <Button
              title="No, Do Not Share"
              variant="outline"
              onPress={onDecline}
              disabled={updateConsent.isPending}
              className="w-full"
            />
          </CardFooter>
        </Card>

        <Pressable onPress={openPrivacyPolicy} className="mt-4">
          <Text className="text-primary text-center underline">
            View full Privacy Policy
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
