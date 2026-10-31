import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { Button } from "~/lib/ui/button";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";

const dismissedKey = "paypal_nudge_dismissed";

export function PaypalNudgeCard() {
  const t = useTranslations("debts.pay");
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);
  const { data: user } = useQuery(trpc.user.getCurrentUser.queryOptions());

  useEffect(() => {
    AsyncStorage.getItem(dismissedKey)
      .then((value) => setDismissed(value !== null))
      .catch(() => setDismissed(false));
  }, []);

  if (dismissed || !user || user.paypalHandle) return null;

  const dismiss = () => {
    setDismissed(true);
    void AsyncStorage.setItem(dismissedKey, "true");
  };

  return (
    <Card testID="paypal-nudge-card">
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start gap-2">
          <View className="flex-1 gap-1">
            <Text className="text-foreground text-base font-bold">
              {t("faster")}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {t("fasterBody")}
            </Text>
          </View>
          <Pressable
            testID="paypal-nudge-dismiss"
            accessibilityLabel={t("fasterDismiss")}
            hitSlop={8}
            onPress={dismiss}
          >
            <Icon name="x" size={18} color="muted-foreground" />
          </Pressable>
        </View>
        <Button
          testID="paypal-nudge-open"
          title={t("fasterAction")}
          onPress={() =>
            router.navigate("/(tabs)/settings/profile", { withAnchor: true })
          }
        />
      </CardContent>
    </Card>
  );
}
