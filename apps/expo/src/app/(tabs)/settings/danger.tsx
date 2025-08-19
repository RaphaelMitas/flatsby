import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { signOut } from "~/utils/auth/auth-client";

export default function DangerScreen() {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useSuspenseQuery(
    trpc.shoppingList.getCurrentUser.queryOptions(),
  );

  const deleteUserMutation = useMutation(
    trpc.shoppingList.deleteUser.mutationOptions({
      onSuccess: async (data) => {
        if (!data.success) {
          return;
        }

        queryClient.clear();
        await signOut();
      },
    }),
  );

  const handleDeleteUser = () => {
    deleteUserMutation.mutate();
  };

  const isConfirmationValid = confirmationInput === user.email;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <Text className="mb-2 text-2xl font-bold text-destructive">
          Danger Zone
        </Text>
        <Text className="mb-8 text-sm text-muted-foreground">
          Actions in this section are irreversible. Please proceed with caution.
        </Text>

        <Alert variant="destructive" className="mb-6">
          <AlertTitle>
            <View className="flex-row items-center gap-2">
              <Icon name="triangle-alert" size={16} color="destructive" />
              <Text className="text-lg font-semibold text-destructive">
                Delete Account
              </Text>
            </View>
          </AlertTitle>
          <AlertDescription className="text-primary">
            Deleting your account will permanently remove all your data,
            including shopping lists, items, and account information. This
            action cannot be undone.
          </AlertDescription>

          {!showConfirmation ? (
            <Button
              variant="destructive"
              title="Delete My Account"
              icon="trash-2"
              onPress={() => setShowConfirmation(true)}
              className="mt-4 w-full"
            />
          ) : (
            <View className="mt-4 gap-4">
              <View className="gap-2">
                <Text className="text-sm font-medium">
                  Confirmation Required
                </Text>
                <Label htmlFor="email-confirmation" className="mb-2">
                  To confirm deletion, please type your email address:{" "}
                  {user.email}
                </Label>
                <Input
                  value={confirmationInput}
                  onChangeText={setConfirmationInput}
                  placeholder="Enter your email address"
                  className="w-full"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  title="Cancel"
                  onPress={() => {
                    setShowConfirmation(false);
                    setConfirmationInput("");
                  }}
                  className="flex-1"
                />
                <Button
                  variant="destructive"
                  title={
                    deleteUserMutation.isPending
                      ? "Deleting..."
                      : "Delete Forever"
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
          {(deleteUserMutation.isError ||
            (deleteUserMutation.data && !deleteUserMutation.data.success)) && (
            <Alert variant="destructive" className="mt-4">
              <Icon name="circle-alert" size={16} />
              <AlertTitle>Deletion Failed</AlertTitle>
              <AlertDescription>
                {deleteUserMutation.isError
                  ? deleteUserMutation.error.message
                  : !deleteUserMutation.data.success
                    ? deleteUserMutation.data.error.message
                    : "An unknown error occurred"}
              </AlertDescription>
            </Alert>
          )}
        </Alert>
      </ScrollView>
    </SafeAreaView>
  );
}
