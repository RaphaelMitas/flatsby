import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { listCurrencies } from "@flatsby/validators/expenses/formatting";

import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { getPostHog } from "~/utils/analytics/posthog";
import { useUpdateGroup } from "~/utils/useUpdateGroup";

export function ConvertCurrencyBanner({
  groupId,
  groupCurrency,
  currencies,
}: {
  groupId: number;
  groupCurrency: string;
  currencies: string[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const updateGroup = useUpdateGroup(groupId);

  const hasCapturedShown = useRef(false);

  useEffect(() => {
    if (hasCapturedShown.current) return;
    hasCapturedShown.current = true;
    getPostHog().capture("currency_banner_shown", { groupId, currencies });
  }, [groupId, currencies]);

  const keepSeparate = () => {
    updateGroup.mutate({
      id: groupId,
      convertAutomatically: false,
    });
  };

  const turnOn = () => {
    router.push({
      pathname: "/(tabs)/settings/group-settings/expenses",
      params: { highlight: "convert" },
    });
  };

  return (
    <Alert variant="info" className="mt-4 gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <AlertTitle variant="info" className="flex-1 leading-tight">
          {t("expenses.conversion.bannerTitle", {
            currencies: listCurrencies(currencies, groupCurrency, t),
          })}
        </AlertTitle>
        <Pressable
          testID="currency-banner-dismiss"
          accessibilityRole="button"
          accessibilityLabel={t("expenses.conversion.keepSeparate")}
          hitSlop={8}
          onPress={keepSeparate}
        >
          <Icon name="x" size={16} color="muted-foreground" />
        </Pressable>
      </View>
      <AlertDescription>
        {t("expenses.conversion.bannerBody", { currency: groupCurrency })}
      </AlertDescription>
      <View className="flex-row justify-end gap-2">
        <Button
          testID="currency-banner-keep-separate"
          title={t("expenses.conversion.keepSeparate")}
          variant="outline"
          size="sm"
          onPress={keepSeparate}
        />
        <Button
          testID="currency-banner-turn-on"
          title={t("expenses.conversion.turnOn")}
          size="sm"
          onPress={turnOn}
        />
      </View>
    </Alert>
  );
}
