import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { isE2ETestingEnabled } from "~/utils/e2e";

const HAND_ADDS_KEY = "siri_tip_hand_adds";
const DISMISSED_KEY = "siri_tip_dismissed";
const MIN_HAND_ADDS = 3;

const enabled = Platform.OS === "ios" && !isE2ETestingEnabled();

export function countHandAddedItem() {
  if (!enabled) return;
  AsyncStorage.getItem(HAND_ADDS_KEY)
    .then((adds) =>
      AsyncStorage.setItem(HAND_ADDS_KEY, String(Number(adds) + 1)),
    )
    .catch(() => undefined);
}

export function SiriTip() {
  const t = useTranslations("siri.tip");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    Promise.all([
      AsyncStorage.getItem(HAND_ADDS_KEY),
      AsyncStorage.getItem(DISMISSED_KEY),
    ])
      .then(([adds, dismissed]) =>
        setVisible(dismissed === null && Number(adds) >= MIN_HAND_ADDS),
      )
      .catch(() => undefined);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    void AsyncStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <Card className="mx-4 mt-2 mb-2">
      <CardContent className="flex-row items-start gap-2 p-4">
        <View className="flex-1 gap-1">
          <Text className="text-foreground text-base font-bold">
            {t("title")}
          </Text>
          <Text className="text-muted-foreground text-sm">{t("body")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dismiss")}
          hitSlop={8}
          onPress={dismiss}
        >
          <Icon name="x" size={18} color="muted-foreground" />
        </Pressable>
      </CardContent>
    </Card>
  );
}
