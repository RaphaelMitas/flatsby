import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Text, View } from "react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslations } from "use-intl";

import type { UpdateNudgeFrequency } from "~/utils/update-nudge-frequency";
import { ChoiceButtons } from "~/components/settings/ChoiceButtons";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { getPostHog } from "~/utils/analytics/posthog";
import { isE2ETestingEnabled } from "~/utils/e2e";
import {
  updateNudgeFrequency,
  useUpdateNudgeChoices,
} from "~/utils/update-nudge-frequency";

const DISMISSED_KEY = "update_nudge_dismissed_version";
const DISMISSED_AT_KEY = "update_nudge_dismissed_at";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

async function wasDismissed(
  frequency: UpdateNudgeFrequency,
  storeVersion: string,
) {
  if (frequency === "monthly") {
    const dismissedAt = Number(await AsyncStorage.getItem(DISMISSED_AT_KEY));
    return Math.abs(Date.now() - dismissedAt) < MONTH_MS;
  }
  return (await AsyncStorage.getItem(DISMISSED_KEY)) === storeVersion;
}

async function availableStoreVersion() {
  const update = await ExpoInAppUpdates.checkForUpdate().catch(() => null);
  if (!update?.updateAvailable || update.updateInProgress) return null;
  if (Platform.OS === "android" && !update.immediateAllowed) return null;
  return update.storeVersion;
}

export function UpdateNudge() {
  const t = useTranslations("appUpdate");
  const sheetRef = useRef<BottomSheetModal>(null);
  const [storeVersion, setStoreVersion] = useState<string | null>(null);
  const updatePressed = useRef(false);
  const [choosing, setChoosing] = useState(false);
  const frequency = updateNudgeFrequency.useValue();
  const { choices } = useUpdateNudgeChoices();

  useEffect(() => {
    const forced =
      __DEV__ && process.env.EXPO_PUBLIC_FORCE_UPDATE_NUDGE === "true";
    if (!forced && (__DEV__ || isE2ETestingEnabled())) return;
    const check = async () => {
      const frequency = await updateNudgeFrequency.read();
      if (frequency === "off") return;
      const version = forced ? "dev" : await availableStoreVersion();
      if (!version || (await wasDismissed(frequency, version))) return;
      setStoreVersion(version);
    };
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!storeVersion) return;
    getPostHog().capture("update_nudge_shown", { storeVersion });
    sheetRef.current?.present();
  }, [storeVersion]);

  const update = () => {
    getPostHog().capture("update_nudge_update", { storeVersion });
    // iOS can't present the App Store sheet while ours is still presented.
    if (Platform.OS === "ios") {
      updatePressed.current = true;
      sheetRef.current?.dismiss();
    } else {
      void ExpoInAppUpdates.startUpdate(true);
    }
  };

  const choose = (next: UpdateNudgeFrequency) => {
    getPostHog().capture("update_nudge_frequency_set", {
      storeVersion,
      frequency: next,
    });
    updateNudgeFrequency.save(next);
    sheetRef.current?.dismiss();
  };

  return (
    <SheetModal
      ref={sheetRef}
      onDismiss={() => {
        setChoosing(false);
        if (updatePressed.current) {
          updatePressed.current = false;
          void ExpoInAppUpdates.startUpdate(true);
        } else if (storeVersion) {
          void AsyncStorage.multiSet([
            [DISMISSED_KEY, storeVersion],
            [DISMISSED_AT_KEY, String(Date.now())],
          ]);
        }
      }}
    >
      <View className="gap-2 px-4 pb-10">
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
        {choosing ? (
          <View className="gap-2 pt-2">
            <Text className="text-muted-foreground text-center text-sm">
              {t("howOften")}
            </Text>
            <View className="flex-row gap-2">
              <ChoiceButtons
                choices={choices}
                selected={frequency}
                onSelect={choose}
              />
            </View>
          </View>
        ) : (
          <Button
            testID="update-nudge-less"
            title={t("remindLess")}
            variant="ghost"
            onPress={() => setChoosing(true)}
          />
        )}
      </View>
    </SheetModal>
  );
}
