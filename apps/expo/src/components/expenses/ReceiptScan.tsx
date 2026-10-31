import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import type { ImagePickerOptions } from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  RECEIPT_IMAGE_MAX_EDGE,
  RECEIPT_IMAGE_QUALITY,
} from "@flatsby/validators/expenses/receipt-scan";
import { receiptPreview } from "@flatsby/validators/expenses/useReceiptScan";

import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { useThemeColors } from "~/lib/utils";
import { trpc } from "~/utils/api";

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
  return base64;
}

export function ReceiptScanCard({
  receiptScan,
  currency,
}: {
  receiptScan: ReceiptScan;
  currency: CurrencyCode;
}) {
  const t = useTranslations("expenses.receiptScan");
  const locale = useLocale();
  const router = useRouter();
  const { getColor } = useThemeColors();
  const sourceSheet = useRef<BottomSheetModal>(null);
  const previewSheet = useRef<BottomSheetModal>(null);
  const chosenSource = useRef<Source | null>(null);
  const [photoUri, setPhotoUri] = useState<string>();
  const { data: usage } = useQuery(trpc.user.getUsage.queryOptions());
  const { state } = receiptScan;

  useEffect(() => {
    if (state.status === "found") previewSheet.current?.present();
  }, [state.status]);

  const takeFrom = async (source: Source) => {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        receiptScan.fail(t("cameraDenied"));
        return;
      }
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPhotoUri(asset.uri);
    const base64 = await receiptBase64(asset.uri).catch(() => undefined);
    if (base64) void receiptScan.scan(base64);
    else receiptScan.fail(t("unsupportedFormat"));
  };

  const choose = (source: Source) => {
    // iOS drops the picker if it presents while our sheet is still up
    chosenSource.current = source;
    sourceSheet.current?.dismiss();
  };

  const preview = receiptScan.lastScan
    ? receiptPreview(receiptScan.lastScan, currency, locale)
    : null;

  return (
    <>
      {state.status === "reading" ? (
        <View
          testID="receipt-scan-reading"
          className="border-border bg-muted flex-row items-center gap-3 rounded-lg border p-3"
        >
          {photoUri && (
            <Image source={{ uri: photoUri }} className="h-12 w-9 rounded" />
          )}
          <View className="flex-1">
            <Text className="text-foreground font-semibold">
              {t("reading")}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {t("readingHint")}
            </Text>
          </View>
          <ActivityIndicator color={getColor("muted-foreground")} />
        </View>
      ) : state.status === "failed" ? (
        <Alert variant="destructive" className="gap-3">
          <View>
            <AlertTitle>
              {state.message ? t("failedTitle") : t("unreadableTitle")}
            </AlertTitle>
            <AlertDescription>
              {state.message ?? t("unreadableBody")}
            </AlertDescription>
          </View>
          <Button
            testID="receipt-scan-retry"
            title={t("newPhoto")}
            variant="outline"
            size="sm"
            icon="camera"
            onPress={() => sourceSheet.current?.present()}
          />
        </Alert>
      ) : usage?.credits?.balance === 0 ? (
        <Pressable
          testID="receipt-scan-out-of-credits"
          accessibilityRole="button"
          onPress={() => router.push("/settings/credits")}
          className="border-border bg-muted flex-row items-center gap-3 rounded-lg border p-4"
        >
          <View className="bg-background size-10 items-center justify-center rounded-lg">
            <Icon name="lock" size={20} color="muted-foreground" />
          </View>
          <View className="flex-1">
            <Text className="text-foreground font-semibold">{t("title")}</Text>
            <Text className="text-muted-foreground text-sm">
              {t("outOfCredits")}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="muted-foreground" />
        </Pressable>
      ) : (
        <Pressable
          testID="receipt-scan"
          accessibilityRole="button"
          onPress={() => sourceSheet.current?.present()}
          className="border-muted-foreground active:bg-muted flex-row items-center gap-3 rounded-lg border border-dashed p-4"
        >
          <View className="bg-muted size-10 items-center justify-center rounded-lg">
            <Icon name="camera" size={20} color="foreground" />
          </View>
          <View className="flex-1">
            <Text className="text-foreground font-semibold">{t("title")}</Text>
            <Text className="text-muted-foreground text-sm">
              {t("subtitle")}
            </Text>
          </View>
        </Pressable>
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
            {t("title")}
          </Text>
          <SourceOption
            testID="receipt-scan-camera"
            icon="camera"
            title={t("takePhoto")}
            hint={t("takePhotoHint")}
            onPress={() => choose("camera")}
          />
          <SourceOption
            testID="receipt-scan-library"
            icon="image"
            title={t("choosePhoto")}
            hint={t("choosePhotoHint")}
            onPress={() => choose("library")}
          />
          <Text className="text-muted-foreground text-xs">
            {t("disclosure")}
          </Text>
        </View>
      </SheetModal>

      <SheetModal
        ref={previewSheet}
        onDismiss={() => {
          if (receiptScan.state.status === "found") receiptScan.reset();
        }}
      >
        <View testID="receipt-scan-preview" className="gap-4 px-4 pb-10">
          <Text className="text-foreground text-lg font-semibold">
            {t("previewTitle")}
          </Text>
          {preview && (
            <View className="gap-2">
              <PreviewRow label={t("store")} value={preview.store} />
              <PreviewRow label={t("amount")} value={preview.amount} />
              <PreviewRow label={t("date")} value={preview.date} />
            </View>
          )}
          <View className="flex-row gap-2">
            <Button
              testID="receipt-scan-discard"
              title={t("discard")}
              variant="outline"
              className="flex-1"
              onPress={() => previewSheet.current?.dismiss()}
            />
            <Button
              testID="receipt-scan-apply"
              title={t("apply")}
              className="flex-1"
              onPress={() => {
                receiptScan.apply();
                previewSheet.current?.dismiss();
              }}
            />
          </View>
        </View>
      </SheetModal>
    </>
  );
}

function SourceOption({
  testID,
  icon,
  title,
  hint,
  onPress,
}: {
  testID: string;
  icon: "camera" | "image";
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className="border-border active:bg-muted flex-row items-center gap-3 rounded-lg border p-3"
    >
      <View className="bg-muted size-9 items-center justify-center rounded-lg">
        <Icon name={icon} size={18} color="foreground" />
      </View>
      <View className="flex-1">
        <Text className="text-foreground font-semibold">{title}</Text>
        <Text className="text-muted-foreground text-sm">{hint}</Text>
      </View>
    </Pressable>
  );
}

function PreviewRow({ label, value }: { label: string; value: string | null }) {
  const t = useTranslations("expenses.receiptScan");
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-muted-foreground">{label}</Text>
      <Text
        className={
          value
            ? "text-foreground flex-1 text-right font-semibold"
            : "text-warning flex-1 text-right"
        }
      >
        {value ?? t("notFound")}
      </Text>
    </View>
  );
}
