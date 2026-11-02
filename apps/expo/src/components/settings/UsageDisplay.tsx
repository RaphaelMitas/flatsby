import { Linking, Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { formatCredits } from "@flatsby/validators/billing";

import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";
import { SettingsItem } from "./SettingsItem";
import { SettingsSection } from "./SettingsSection";

const canBuyInApp = Platform.OS === "ios";

export function UsageDisplay() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data } = useSuspenseQuery(trpc.user.getUsage.queryOptions());

  const credits = data.credits;

  const handlePress = () => {
    if (canBuyInApp) router.push("/settings/credits");
    else void Linking.openURL(`${getBaseUrl()}/user-settings`);
  };

  if (!credits) {
    return canBuyInApp ? (
      <SettingsSection>
        <SettingsItem
          title={t("settings.items.buyCredits")}
          iconName="zap"
          onPress={handlePress}
        />
      </SettingsSection>
    ) : null;
  }

  const { balance, usage } = credits;
  const total = usage + balance;
  const remainingPercent = total === 0 ? 100 : (balance / total) * 100;

  return (
    <SettingsSection>
      <Pressable
        onPress={handlePress}
        className="border-border bg-card active:bg-muted flex-row items-center justify-between border-b px-4 py-3"
      >
        <View className="flex-1 flex-row items-center gap-3">
          <View className="bg-primary/10 h-8 w-8 items-center justify-center rounded-full">
            <Icon name="zap" size={16} color="primary" />
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-base font-medium">
              {canBuyInApp
                ? t("settings.items.buyCredits")
                : t("billing.usage.credits")}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {t("billing.usage.remaining", {
                credits: formatCredits(balance, locale),
              })}
            </Text>
            <View className="bg-secondary mt-2 h-2 w-full overflow-hidden rounded-full">
              <View
                className="bg-primary h-full"
                style={{ width: `${Math.max(remainingPercent, 0)}%` }}
              />
            </View>
            {balance === 0 && (
              <Text className="text-destructive mt-1 text-xs">
                {t("billing.usage.outOfCredits")}
              </Text>
            )}
          </View>
        </View>
        <Icon
          name="chevron-right"
          size={16}
          className="text-muted-foreground"
        />
      </Pressable>
    </SettingsSection>
  );
}
