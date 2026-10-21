import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { useBottomSheetPicker } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useHomeVersion } from "~/utils/home-version";

export function HomeInvite() {
  const t = useTranslations("home.new.invite");
  const posthog = usePostHog();
  const { switchTo } = useHomeVersion();

  useEffect(() => {
    posthog.capture("home_invite_shown");
  }, [posthog]);

  return (
    <Card testID="home-invite">
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start gap-2">
          <View className="flex-1 gap-1">
            <Text className="text-foreground text-base font-bold">
              {t("title")}
            </Text>
            <Text className="text-muted-foreground text-sm">{t("body")}</Text>
          </View>
          <Pressable
            testID="home-invite-dismiss"
            accessibilityLabel={t("dismiss")}
            hitSlop={8}
            onPress={() => switchTo("classic", "invite")}
          >
            <Icon name="x" size={18} color="muted-foreground" />
          </Pressable>
        </View>
        <Button
          testID="home-invite-try"
          title={t("try")}
          onPress={() => switchTo("new", "invite")}
        />
      </CardContent>
    </Card>
  );
}

const REASONS = [
  "missing_something",
  "too_little",
  "preferred_stats",
  "no_reason",
] as const;

export function SwitchBack() {
  const t = useTranslations("home.new.switchBack");
  const { openPicker } = useBottomSheetPicker();
  const { switchTo } = useHomeVersion();

  return (
    <Pressable
      testID="home-switch-back"
      onPress={() =>
        openPicker({
          items: REASONS.map((reason) => ({
            id: reason,
            title: t(`reasons.${reason}`),
          })),
          onSelect: ({ id }) => switchTo("classic", "switch_back", id),
        })
      }
      className="mt-10 items-center py-3"
    >
      <Text className="text-muted-foreground text-sm underline">
        {t("link")}
      </Text>
    </Pressable>
  );
}
