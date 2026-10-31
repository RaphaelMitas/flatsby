import { Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Card } from "~/lib/ui/card";
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
  <Card className="flex-row items-center gap-3 p-4">
    <View className="bg-primary/10 h-8 w-8 items-center justify-center rounded-full">
      <Icon name={icon} size={16} className="text-primary" />
    </View>
    <View className="flex-1">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="text-foreground text-base font-medium">{value}</Text>
    </View>
  </Card>
);

export default function AccountScreen() {
  const t = useTranslations("settings.account");
  const locale = useLocale();
  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <SafeAreaView>
      <AppScrollView className="p-4">
        <Text className="text-foreground mb-6 text-2xl font-bold">
          {t("information")}
        </Text>

        <View className="gap-4">
          <InfoRow label={t("email")} value={user.email} icon="mail" />

          <InfoRow label={t("displayName")} value={user.name} icon="user" />

          <InfoRow
            label={t("created")}
            value={formatDate(user.createdAt)}
            icon="calendar"
          />
        </View>

        <Card className="mt-8 rounded-lg p-4">
          <Text className="text-foreground mb-3 text-lg font-semibold">
            {t("settings")}
          </Text>
          <Text className="text-muted-foreground text-sm leading-6">
            {t("emailFixed")}
          </Text>
        </Card>
      </AppScrollView>
    </SafeAreaView>
  );
}
