import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import type { ImagePickerOptions } from "expo-image-picker";
import type { ComponentRef, ReactNode } from "react";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  RECEIPT_IMAGE_MAX_EDGE,
  RECEIPT_IMAGE_QUALITY,
} from "@flatsby/validators/expenses/receipt-scan";

import type { StageOrigin, StagePhoto } from "./ReceiptReadingStage";
import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Button } from "~/lib/ui/button";
import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { cn, useThemeColors } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { Snores } from "../home/Snores";
import { ReceiptReadingStage } from "./ReceiptReadingStage";

type ReceiptScan = ReturnType<typeof useReceiptScan>;
type Source = "camera" | "library";

const PICKER_OPTIONS: ImagePickerOptions = { mediaTypes: ["images"] };

async function receiptBase64(uri: string) {
  // Decoding downsampled also turns HEIC into the JPEG the model reads
  const image = await ImageManipulator.manipulate(uri, {
    maxWidth: RECEIPT_IMAGE_MAX_EDGE,
    maxHeight: RECEIPT_IMAGE_MAX_EDGE,
  }).renderAsync();
  const { base64 } = await image.saveAsync({
    base64: true,
    compress: RECEIPT_IMAGE_QUALITY,
    format: SaveFormat.JPEG,
  });
  if (!base64) throw new Error("No image data");
  return base64;
}

export function ReceiptScanCard({ receiptScan }: { receiptScan: ReceiptScan }) {
  const t = useTranslations();
  const router = useRouter();
  const { getColor } = useThemeColors();
  const sourceSheet = useRef<BottomSheetModal>(null);
  const upgradeSheet = useRef<BottomSheetModal>(null);
  const chosenSource = useRef<Source | null>(null);
  const goUpgrade = useRef(false);
  const card = useRef<ComponentRef<typeof View>>(null);
  const [photo, setPhoto] = useState<StagePhoto>();
  const [origin, setOrigin] = useState<StageOrigin>();
  const { data: usage } = useQuery(trpc.user.getUsage.queryOptions());
  const { state } = receiptScan;

  const takeFrom = async (source: Source) => {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        receiptScan.fail(t("expenses.receiptScan.cameraDenied"));
        return;
      }
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    card.current?.measureInWindow((x, y, width, height) =>
      setOrigin({ x, y, width, height }),
    );
    void receiptScan.scan(() => receiptBase64(asset.uri));
  };

  const choose = (source: Source) => {
    // iOS drops the picker if it presents while our sheet is still up
    chosenSource.current = source;
    sourceSheet.current?.dismiss();
  };

  return (
    <View ref={card} collapsable={false}>
      {usage?.credits?.balance === 0 ? (
        <OptionRow
          testID="receipt-scan-out-of-credits"
          art={<SleepingCat size={34} />}
          title={t("expenses.receiptScan.title")}
          hint={t("expenses.receiptScan.outOfCredits")}
          trailing
          className="bg-muted"
          onPress={() => upgradeSheet.current?.present()}
        />
      ) : state.status === "failed" ? (
        <Alert variant="destructive" className="gap-3">
          <View className="flex-row items-center gap-3">
            <View style={{ transform: [{ rotate: "-9deg" }] }}>
              <FlatsbyCat size={36} color={getColor("primary")} squint />
            </View>
            <View className="flex-1">
              <AlertTitle>
                {state.message
                  ? t("expenses.receiptScan.failedTitle")
                  : t("expenses.receiptScan.unreadableTitle")}
              </AlertTitle>
              <AlertDescription>
                {state.message ?? t("expenses.receiptScan.unreadableBody")}
              </AlertDescription>
            </View>
          </View>
          <Button
            testID="receipt-scan-retry"
            title={t("expenses.receiptScan.newPhoto")}
            variant="outline"
            size="sm"
            icon="camera"
            onPress={() => sourceSheet.current?.present()}
          />
        </Alert>
      ) : (
        <OptionRow
          testID="receipt-scan"
          icon="camera"
          title={t("expenses.receiptScan.title")}
          hint={t("expenses.receiptScan.subtitle")}
          className="border-muted-foreground border-dashed"
          onPress={() => sourceSheet.current?.present()}
        />
      )}

      <SheetModal
        ref={sourceSheet}
        onDismiss={() => {
          const source = chosenSource.current;
          chosenSource.current = null;
          if (source) void takeFrom(source);
        }}
      >
        <View className="gap-3 px-4 pb-10">
          <Text className="text-foreground text-lg font-semibold">
            {t("expenses.receiptScan.title")}
          </Text>
          <OptionRow
            testID="receipt-scan-camera"
            icon="camera"
            title={t("expenses.receiptScan.takePhoto")}
            hint={t("expenses.receiptScan.takePhotoHint")}
            onPress={() => choose("camera")}
          />
          <OptionRow
            testID="receipt-scan-library"
            icon="image"
            title={t("expenses.receiptScan.choosePhoto")}
            hint={t("expenses.receiptScan.choosePhotoHint")}
            onPress={() => choose("library")}
          />
          <Text className="text-muted-foreground text-xs">
            {t("expenses.receiptScan.disclosure")}
          </Text>
        </View>
      </SheetModal>

      <SheetModal
        ref={upgradeSheet}
        onDismiss={() => {
          // iOS can't push a screen while the sheet is still presented
          if (goUpgrade.current) router.push("/settings/credits");
          goUpgrade.current = false;
        }}
      >
        <View
          testID="receipt-scan-upgrade"
          className="items-center gap-2 px-6 pb-10"
        >
          <SleepingCat size={112} />
          <Text className="text-foreground mt-2 text-center text-lg font-semibold">
            {t("expenses.receiptScan.outOfCreditsTitle")}
          </Text>
          <Text className="text-muted-foreground mb-4 text-center text-sm">
            {t("expenses.receiptScan.outOfCreditsBody")}
          </Text>
          <View className="w-full flex-row gap-2">
            <Button
              title={t("expenses.receiptScan.fillManually")}
              variant="outline"
              className="flex-1"
              onPress={() => upgradeSheet.current?.dismiss()}
            />
            <Button
              testID="receipt-scan-upgrade-button"
              title={t("billing.pricing.upgrade")}
              className="flex-1"
              onPress={() => {
                goUpgrade.current = true;
                upgradeSheet.current?.dismiss();
              }}
            />
          </View>
        </View>
      </SheetModal>

      <ReceiptReadingStage
        receiptScan={receiptScan}
        photo={photo}
        origin={origin}
      />
    </View>
  );
}

function SleepingCat({ size }: { size: number }) {
  const { getColor } = useThemeColors();
  const reduced = useReducedMotion();
  return (
    <View style={{ width: size, height: size }}>
      <FlatsbyCat size={size} color={getColor("primary")} asleep />
      {!reduced && (
        <Snores
          drift={1}
          className="absolute"
          style={{ left: size * 0.8, top: size * 0.15 }}
        />
      )}
    </View>
  );
}

function OptionRow({
  testID,
  icon,
  art,
  title,
  hint,
  trailing,
  className,
  onPress,
}: {
  testID: string;
  icon?: IconProps["name"];
  art?: ReactNode;
  title: string;
  hint?: string;
  trailing?: boolean;
  className?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "border-border active:bg-muted flex-row items-center gap-3 rounded-lg border p-3",
        className,
      )}
    >
      <View className="bg-muted size-10 items-center justify-center rounded-lg">
        {art ?? (icon && <Icon name={icon} size={20} color="foreground" />)}
      </View>
      <View className="flex-1">
        <Text className="text-foreground font-semibold">{title}</Text>
        {hint && <Text className="text-muted-foreground text-sm">{hint}</Text>}
      </View>
      {trailing && (
        <Icon name="chevron-right" size={16} color="muted-foreground" />
      )}
    </Pressable>
  );
}
