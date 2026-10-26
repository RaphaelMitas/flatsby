import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { signOut } from "~/utils/auth/auth-client";

export default function DangerScreen() {
  const t = useTranslations();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const deleteUserMutation = useMutation(
    trpc.user.deleteUser.mutationOptions({
      onSuccess: async (data) => {
        if (!data.success) {
          return;
        }

        await signOut();
      },
    }),
  );

  const handleDeleteUser = () => {
    deleteUserMutation.mutate();
  };

  const isConfirmationValid = confirmationInput === user.email;
  const deleteFailure = failureOf(
    deleteUserMutation,
    t("settings.danger.unknownError"),
  );

  return (
    <SafeAreaView>
      <AppScrollView className="p-4">
        <Text
          testID="delete-user-danger-zone-title"
          className="text-destructive mb-2 text-2xl font-bold"
        >
          {t("navigation.dangerZone")}
        </Text>
        <Text className="text-muted-foreground mb-8 text-sm">
          {t("settings.danger.description")}
        </Text>

        <Alert variant="destructive" className="mb-6">
          <AlertTitle>
            <View className="flex-row items-center gap-2">
              <Icon name="triangle-alert" size={16} color="destructive" />
              <Text className="text-destructive text-lg font-semibold">
                {t("settings.danger.deleteAccount")}
              </Text>
            </View>
          </AlertTitle>
          <AlertDescription className="text-primary">
            {t("settings.danger.deleteAccountDescription")}
          </AlertDescription>

          {!showConfirmation ? (
            <Button
              testID="delete-user-confirm-button"
              variant="destructive"
              title={t("settings.danger.deleteMyAccount")}
              icon="trash-2"
              onPress={() => setShowConfirmation(true)}
              className="mt-4 w-full"
            />
          ) : (
            <View className="mt-4 gap-4">
              <View className="gap-2">
                <Text className="text-sm font-medium">
                  {t("settings.danger.confirmationRequired")}
                </Text>
                <Label htmlFor="email-confirmation" className="mb-2">
                  {t("settings.danger.typeEmail")}
                </Label>
                <Text
                  testID="delete-user-email"
                  className="text-muted-foreground mb-2 text-sm"
                >
                  {user.email}
                </Text>
                <Input
                  testID="delete-user-email-input"
                  value={confirmationInput}
                  onChangeText={setConfirmationInput}
                  placeholder={t("settings.danger.emailPlaceholder")}
                  className="w-full"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View className="flex-row gap-2">
                <Button
                  testID="delete-user-cancel-button"
                  variant="outline"
                  title={t("common.cancel")}
                  onPress={() => {
                    setShowConfirmation(false);
                    setConfirmationInput("");
                  }}
                  className="flex-1"
                />
                <Button
                  testID="delete-user-forever-button"
                  variant="destructive"
                  title={
                    deleteUserMutation.isPending
                      ? t("common.deleting")
                      : t("settings.danger.deleteForever")
                  }
                  disabled={
                    !isConfirmationValid || deleteUserMutation.isPending
                  }
                  onPress={handleDeleteUser}
                  className="flex-1"
                  icon={deleteUserMutation.isPending ? "loader" : "trash-2"}
                />
              </View>
            </View>
          )}

          {/* Error Display */}
          {deleteFailure !== undefined && (
            <Alert variant="destructive" className="mt-4">
              <Icon name="circle-alert" size={16} />
              <AlertTitle>{t("settings.danger.deletionFailed")}</AlertTitle>
              <AlertDescription>{deleteFailure}</AlertDescription>
            </Alert>
          )}
        </Alert>
      </AppScrollView>
    </SafeAreaView>
  );
}
