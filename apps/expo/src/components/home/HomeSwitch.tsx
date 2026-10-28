import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { TipCard } from "~/components/TipCard";
import { useBottomSheetPicker } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { useHomeVersion } from "~/utils/home-version";

export function HomeInvite() {
  const t = useTranslations("home.new.invite");
  const posthog = usePostHog();
  const { switchTo } = useHomeVersion();

  useEffect(() => {
    posthog.capture("home_invite_shown");
  }, [posthog]);

  return (
    <TipCard
      testID="home-invite"
      dismissTestID="home-invite-dismiss"
      title={t("title")}
      body={t("body")}
      dismissLabel={t("dismiss")}
      onDismiss={() => switchTo("classic", "invite")}
    >
      <Button
        testID="home-invite-try"
        title={t("try")}
        onPress={() => switchTo("new", "invite")}
      />
    </TipCard>
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
