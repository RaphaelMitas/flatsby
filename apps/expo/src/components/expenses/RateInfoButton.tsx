import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { Pressable, Text } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { styled } from "nativewind";

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
  const sheetRef = useRef<BottomSheetModal>(null);
  const { getColor } = useThemeColors();

  return (
    <>
      <Pressable
        testID="rate-info-button"
        accessibilityRole="button"
        accessibilityLabel="Where this rate comes from"
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
            Where this rate comes from
          </Text>
          <Text className="text-muted-foreground text-sm">
            European Central Bank reference rate for the expense date, via
            Frankfurter. Published on working days, so a weekend expense uses
            Friday's rate.
          </Text>
          <Text className="text-muted-foreground text-sm">
            Your card or bank may charge a different rate. Type what you
            actually paid in {targetCurrency} and the rate follows.
          </Text>
        </BottomSheetView>
      </Sheet>
    </>
  );
}
