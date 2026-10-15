import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { Pressable, Text } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { styled } from "nativewind";
import { useTranslations } from "use-intl";

import { bottomSheetVariants } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useThemeColors } from "~/lib/utils";

const Sheet = styled(BottomSheetModal, {
  className: { target: "backgroundStyle" },
});

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
);

export function RateInfoButton({ targetCurrency }: { targetCurrency: string }) {
  const t = useTranslations("expenses.conversion");
  const sheetRef = useRef<BottomSheetModal>(null);
  const { getColor } = useThemeColors();

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
      <Sheet
        ref={sheetRef}
        className={bottomSheetVariants()}
        handleIndicatorStyle={{ backgroundColor: getColor("primary") }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView className="gap-3 px-4 pb-10">
          <Text className="text-foreground text-lg font-semibold">
            {t("rateSourceTitle")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("rateSourceBody")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("rateSourceOwnRate", { currency: targetCurrency })}
          </Text>
        </BottomSheetView>
      </Sheet>
    </>
  );
}
