import { Linking, Pressable, Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";

import { formatCredits } from "@flatsby/validators/billing";

import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";

export function UsageDisplay() {
  const { data } = useSuspenseQuery(trpc.user.getUsage.queryOptions());

  const credits = data.credits;

  if (!credits) {
    return null;
  }

  const { balance, usage } = credits;
  const total = usage + balance;
  const remainingPercent = total === 0 ? 100 : (balance / total) * 100;

  const handlePress = () => {
    void Linking.openURL(`${getBaseUrl()}/user-settings`);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="border-border bg-card active:bg-muted flex-row items-center justify-between border-b px-4 py-3"
    >
      <View className="flex-1 flex-row items-center gap-3">
        <View className="bg-primary/10 h-8 w-8 items-center justify-center rounded-full">
          <Icon name="zap" size={16} color="primary" />
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-base font-medium">Credits</Text>
          <Text className="text-muted-foreground text-sm">
            {formatCredits(balance)} remaining
          </Text>
          <View className="bg-secondary mt-2 h-2 w-full overflow-hidden rounded-full">
            <View
              className="bg-primary h-full"
              style={{ width: `${Math.max(remainingPercent, 0)}%` }}
            />
          </View>
          {balance === 0 && (
            <Text className="text-destructive mt-1 text-xs">
              Out of credits. Tap to upgrade.
            </Text>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={16} className="text-muted-foreground" />
    </Pressable>
  );
}
