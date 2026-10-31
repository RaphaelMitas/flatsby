import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "~/lib/ui/button";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { Switch } from "~/lib/ui/switch";
import {
  useAnalyticsConsent,
  useSaveAnalyticsConsent,
} from "~/utils/analytics/consent";
import { openLegalPage } from "~/utils/legal";

export function useAnalyticsConsentSheet() {
  const t = useTranslations("settings.analytics");
  const locale = useLocale();
  const sheetRef = useRef<BottomSheetModal>(null);
  const consent = useAnalyticsConsent();
  const save = useSaveAnalyticsConsent();

  const open = () => sheetRef.current?.present();
  const setScreens = (screens: boolean) => save({ screens });

  const sheet = (
    <SheetModal ref={sheetRef}>
      <View className="gap-3 px-4 pb-10">
        <Text className="text-foreground text-lg font-semibold">
          {t("sheetTitle")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t.rich("sheetBody", {
            link: (chunks) => (
              <Text
                className="underline"
                onPress={() => openLegalPage(locale, "privacy", "analytics")}
              >
                {chunks}
              </Text>
            ),
          })}
        </Text>
        <Pressable
          testID="analytics-sheet-screens"
          className="flex-row items-center justify-between gap-3 py-2"
          onPress={() => setScreens(!consent.screens)}
        >
          <View className="flex-1">
            <Text className="text-foreground text-base font-medium">
              {t("screens")}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {t("screensKept")}
            </Text>
          </View>
          <Switch checked={consent.screens} onCheckedChange={setScreens} />
        </Pressable>
        <Button
          testID="analytics-sheet-done"
          title={t("done")}
          variant="outline"
          onPress={() => sheetRef.current?.dismiss()}
        />
      </View>
    </SheetModal>
  );

  return { open, sheet };
}
