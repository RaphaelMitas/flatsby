import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";

export function RateInfoButton({ targetCurrency }: { targetCurrency: string }) {
  const t = useTranslations("expenses.conversion");
  const sheetRef = useRef<BottomSheetModal>(null);

  return (
    <>
      <Pressable
        testID="rate-info-button"
        accessibilityRole="button"
        accessibilityLabel={t("rateSourceTitle")}
        hitSlop={8}
        onPress={() => sheetRef.current?.present()}
      >
        <Icon name="info" size={14} color="muted-foreground" />
      </Pressable>
      <SheetModal ref={sheetRef}>
        <View className="gap-3 px-4 pb-10">
          <Text className="text-foreground text-lg font-semibold">
            {t("rateSourceTitle")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("rateSourceBody")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("rateSourceOwnRate", { currency: targetCurrency })}
          </Text>
        </View>
      </SheetModal>
    </>
  );
}
