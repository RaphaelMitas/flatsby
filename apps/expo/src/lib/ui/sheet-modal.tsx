import type {
  BottomSheetBackdropProps,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import type { Ref } from "react";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { styled } from "nativewind";

import { bottomSheetVariants } from "~/lib/ui/bottom-sheet-picker";
import { useThemeColors } from "~/lib/utils";

const StyledSheet = styled(BottomSheetModal, {
  className: { target: "backgroundStyle" },
});

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
);

export function SheetModal({
  ref,
  ...props
}: BottomSheetModalProps & { ref: Ref<BottomSheetModal> }) {
  const { getColor } = useThemeColors();

  return (
    <StyledSheet
      ref={ref}
      className={bottomSheetVariants()}
      handleIndicatorStyle={{ backgroundColor: getColor("primary") }}
      backdropComponent={renderBackdrop}
      {...props}
    />
  );
}
