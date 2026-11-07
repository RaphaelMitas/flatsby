import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { ReceiptTextLine } from "@flatsby/validators/expenses/receipt-scan";
import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import type { ImagePickerOptions } from "expo-image-picker";
import type { ComponentRef, ReactNode } from "react";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useTranslations } from "use-intl";

import { receiptDocument } from "@flatsby/validators/expenses/receipt-document";
import {
  RECEIPT_IMAGE_MAX_EDGE,
  RECEIPT_IMAGE_QUALITY,
  receiptMarks,
} from "@flatsby/validators/expenses/receipt-scan";

import type { StageOrigin, StagePhoto } from "./ReceiptReadingStage";
import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Badge } from "~/lib/ui/badge";
import { Button } from "~/lib/ui/button";
import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { cn, useThemeColors } from "~/lib/utils";
import { recognizeLines } from "../../../modules/receipt-text";
import { ReceiptReadingStage } from "./ReceiptReadingStage";

type ReceiptScan = ReturnType<typeof useReceiptScan>;
type Source = "camera" | "library" | "pdf";

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
  const { getColor } = useThemeColors();
  const sourceSheet = useRef<BottomSheetModal>(null);
  const chosenSource = useRef<Source | null>(null);
  const card = useRef<ComponentRef<typeof View>>(null);
  const [photo, setPhoto] = useState<StagePhoto | "document">();
  const [origin, setOrigin] = useState<StageOrigin>();
  const [lines, setLines] = useState<ReceiptTextLine[]>([]);
  const { state } = receiptScan;
  const beta = (
    <Badge
      variant="beta"
      size="sm"
      icon={<Icon name="flask-conical" size={11} color="primary-foreground" />}
      label={t("common.beta")}
    />
  );

  const open = (paper: StagePhoto | "document") => {
    setPhoto(paper);
    card.current?.measureInWindow((x, y, width, height) =>
      setOrigin({ x, y, width, height }),
    );
    setLines([]);
  };

  const takeFrom = async (source: Source) => {
    if (source === "pdf") {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;
      // The picker leaves a PDF's size out for some providers; the cached copy always has one
      const file = new File(asset.uri);
      open("document");
      void receiptScan.scan("application/pdf", () => file.base64(), file.size);
      return;
    }
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
    open({ uri: asset.uri, width: asset.width, height: asset.height });
    void recognizeLines(asset.uri).then(setLines);
    void receiptScan.scan("image/jpeg", () => receiptBase64(asset.uri));
  };

  const choose = (source: Source) => {
    // iOS drops the picker if it presents while our sheet is still up
    chosenSource.current = source;
    sourceSheet.current?.dismiss();
  };

  return (
    <View ref={card} collapsable={false}>
      {state.status === "failed" ? (
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
          badge={beta}
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
          <View className="flex-row items-center gap-2">
            <Text className="text-foreground text-lg font-semibold">
              {t("expenses.receiptScan.title")}
            </Text>
            {beta}
          </View>
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
          <OptionRow
            testID="receipt-scan-pdf"
            icon="file-text"
            title={t("expenses.receiptScan.choosePdf")}
            hint={t("expenses.receiptScan.choosePdfHint")}
            onPress={() => choose("pdf")}
          />
          <Text className="text-muted-foreground text-xs">
            {t("expenses.receiptScan.disclosure")}
          </Text>
        </View>
      </SheetModal>

      <ReceiptReadingStage
        receiptScan={receiptScan}
        photo={photo}
        origin={origin}
        marks={
          photo === "document"
            ? receiptDocument.marks
            : receiptScan.scanned && lines.length > 0
              ? receiptMarks(lines, receiptScan.scanned)
              : {}
        }
      />
    </View>
  );
}

function OptionRow({
  testID,
  icon,
  title,
  badge,
  hint,
  className,
  onPress,
}: {
  testID: string;
  icon: IconProps["name"];
  title: string;
  badge?: ReactNode;
  hint?: string;
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
        <Icon name={icon} size={20} color="foreground" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-foreground font-semibold">{title}</Text>
          {badge}
        </View>
        {hint && <Text className="text-muted-foreground text-sm">{hint}</Text>}
      </View>
    </Pressable>
  );
}
