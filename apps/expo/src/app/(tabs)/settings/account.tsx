import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";

import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";

const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: "mail" | "calendar" | "user";
}) => (
  <View className="flex-row items-center gap-3 rounded-lg bg-card p-4">
    <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
      <Icon name={icon} size={16} className="text-primary" />
    </View>
    <View className="flex-1">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-base font-medium text-foreground">{value}</Text>
    </View>
  </View>
);

export default function AccountScreen() {
  const { data: user } = useSuspenseQuery(
    trpc.shoppingList.getCurrentUser.queryOptions(),
  );

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <Text className="mb-6 text-2xl font-bold text-foreground">
          Account Information
        </Text>

        <View className="gap-4">
          <InfoRow label="Email Address" value={user.email} icon="mail" />

          <InfoRow label="Display Name" value={user.name} icon="user" />

          <InfoRow
            label="Account Created"
            value={formatDate(user.createdAt)}
            icon="calendar"
          />
        </View>

        <View className="mt-8 rounded-lg bg-card p-4">
          <Text className="mb-3 text-lg font-semibold text-foreground">
            Account Settings
          </Text>
          <Text className="text-sm leading-6 text-muted-foreground">
            Your account information is managed through your authentication
            provider. You can't change your email address or other core account
            details.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
