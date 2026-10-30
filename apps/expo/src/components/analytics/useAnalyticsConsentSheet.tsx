import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { AnalyticsConsent } from "@flatsby/validators/user";
import { useRef, useState } from "react";
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
  const current = useAnalyticsConsent();
  const save = useSaveAnalyticsConsent();
  const [draft, setDraft] = useState(current);

  const open = (preset: AnalyticsConsent) => {
    setDraft(preset);
    sheetRef.current?.present();
  };

  const done = () => {
    if (
      draft.screens !== current.screens ||
      draft.recordings !== current.recordings
    )
      save(draft);
    sheetRef.current?.dismiss();
  };

  const row = (key: keyof AnalyticsConsent, title: string, body: string) => (
    <Pressable
      testID={`analytics-sheet-${key}`}
      className="flex-row items-center justify-between gap-3 py-2"
      onPress={() => setDraft({ ...draft, [key]: !draft[key] })}
    >
      <View className="flex-1">
        <Text className="text-foreground text-base font-medium">{title}</Text>
        <Text className="text-muted-foreground text-sm">{body}</Text>
      </View>
      <Switch
        checked={draft[key]}
        onCheckedChange={(checked) => setDraft({ ...draft, [key]: checked })}
      />
    </Pressable>
  );

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
        {row("screens", t("screens"), t("screensKept"))}
        {row("recordings", t("recordings"), t("recordingsKept"))}
        <Button
          testID="analytics-sheet-done"
          title={t("done")}
          variant="outline"
          onPress={done}
        />
      </View>
    </SheetModal>
  );

  return { open, sheet };
}
