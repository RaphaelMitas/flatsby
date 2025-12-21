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
  <View className="bg-card flex-row items-center gap-3 rounded-lg p-4">
    <View className="bg-primary/10 h-8 w-8 items-center justify-center rounded-full">
      <Icon name={icon} size={16} className="text-primary" />
    </View>
    <View className="flex-1">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="text-foreground text-base font-medium">{value}</Text>
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
    <SafeAreaView className="bg-background flex-1">
      <ScrollView className="p-4">
        <Text className="text-foreground mb-6 text-2xl font-bold">
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

        <View className="bg-card mt-8 rounded-lg p-4">
          <Text className="text-foreground mb-3 text-lg font-semibold">
            Account Settings
          </Text>
          <Text className="text-muted-foreground text-sm leading-6">
            Your account information is managed through your authentication
            provider. You can't change your email address or other core account
            details.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
