import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Text, View } from "react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { isE2ETestingEnabled } from "~/utils/e2e";

const DISMISSED_KEY = "update_nudge_dismissed_version";

export function UpdateNudge() {
  const t = useTranslations("appUpdate");
  const posthog = usePostHog();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [storeVersion, setStoreVersion] = useState<string | null>(null);

  useEffect(() => {
    if (__DEV__ || isE2ETestingEnabled()) return;
    const check = async () => {
      const update = await ExpoInAppUpdates.checkForUpdate().catch(() => null);
      if (!update?.updateAvailable || update.updateInProgress) return;
      if (Platform.OS === "android" && !update.immediateAllowed) return;
      if ((await AsyncStorage.getItem(DISMISSED_KEY)) === update.storeVersion)
        return;
      setStoreVersion(update.storeVersion);
    };
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!storeVersion) return;
    posthog.capture("update_nudge_shown", { storeVersion });
    sheetRef.current?.present();
  }, [storeVersion, posthog]);

  const update = () => {
    posthog.capture("update_nudge_update", { storeVersion });
    sheetRef.current?.dismiss();
    void ExpoInAppUpdates.startUpdate(true);
  };

  return (
    <SheetModal
      ref={sheetRef}
      onDismiss={() => {
        if (storeVersion)
          void AsyncStorage.setItem(DISMISSED_KEY, storeVersion);
      }}
    >
      <BottomSheetView className="gap-2 px-4 pb-10">
        <View className="bg-muted size-14 items-center justify-center rounded-2xl">
          <Icon name="flatsby" size={32} color="foreground" />
        </View>
        <Text className="text-foreground mt-2 text-xl font-semibold">
          {t("title")}
        </Text>
        <Text className="text-muted-foreground mb-4 text-sm">{t("body")}</Text>
        <Button
          testID="update-nudge-update"
          title={t("update")}
          onPress={update}
        />
        <Button
          testID="update-nudge-later"
          title={t("later")}
          variant="ghost"
          onPress={() => sheetRef.current?.dismiss()}
        />
      </BottomSheetView>
    </SheetModal>
  );
}
