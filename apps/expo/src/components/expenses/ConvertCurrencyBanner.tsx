import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";

import { listCurrencies } from "@flatsby/validators/expenses/formatting";

import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
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
  const router = useRouter();
  const posthog = usePostHog();
  const updateGroup = useUpdateGroup(groupId);

  const hasCapturedShown = useRef(false);

  useEffect(() => {
    if (hasCapturedShown.current) return;
    hasCapturedShown.current = true;
    posthog.capture("currency_banner_shown", { groupId, currencies });
  }, [posthog, groupId, currencies]);

  const keepSeparate = () => {
    posthog.capture("currency_banner_keep_separate", { groupId });
    updateGroup.mutate({
      id: groupId,
      convertAutomatically: false,
      onlyIfUndecided: true,
    });
  };

  const turnOn = () => {
    posthog.capture("currency_banner_turn_on", { groupId });
    router.push({
      pathname: "/(tabs)/settings/group-settings/expenses",
      params: { highlight: "convert" },
    });
  };

  return (
    <Alert variant="info" className="mt-4 gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <AlertTitle variant="info" className="flex-1 leading-tight">
          Debts are now in {listCurrencies(currencies, groupCurrency)}
        </AlertTitle>
        <Pressable
          testID="currency-banner-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Keep separate"
          hitSlop={8}
          onPress={keepSeparate}
        >
          <Icon name="x" size={16} color="muted-foreground" />
        </Pressable>
      </View>
      <AlertDescription>
        Turn on automatic conversion and new expenses in other currencies count
        toward {groupCurrency} debts instead.
      </AlertDescription>
      <View className="flex-row justify-end gap-2">
        <Button
          testID="currency-banner-keep-separate"
          title="Keep separate"
          variant="outline"
          size="sm"
          onPress={keepSeparate}
        />
        <Button
          testID="currency-banner-turn-on"
          title="Turn on"
          size="sm"
          onPress={turnOn}
        />
      </View>
    </Alert>
  );
}
