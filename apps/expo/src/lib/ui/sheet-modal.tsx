import type {
  BottomSheetBackdropProps,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import type { Ref } from "react";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { styled } from "nativewind";
import { tv } from "tailwind-variants";

import { useThemeColors } from "~/lib/utils";

export const bottomSheetVariants = tv({
  base: "bg-background border-2 border-muted rounded-t-3xl",
});

const StyledSheet = styled(BottomSheetModal, {
  className: { target: "backgroundStyle" },
});

export const renderBackdrop = (props: BottomSheetBackdropProps) => (
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
