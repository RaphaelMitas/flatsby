"use client";

import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { Camera, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Badge } from "@flatsby/ui/badge";
import { Button } from "@flatsby/ui/button";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import { receiptDocument } from "@flatsby/validators/expenses/receipt-document";
import {
  RECEIPT_IMAGE_MAX_EDGE,
  RECEIPT_IMAGE_QUALITY,
} from "@flatsby/validators/expenses/receipt-scan";

import { ReceiptReadingStage } from "./ReceiptReadingStage";

interface ReceiptScanProps {
  receiptScan: ReturnType<typeof useReceiptScan>;
  fileInput: RefObject<HTMLInputElement | null>;
}

async function receiptBase64(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    RECEIPT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return base64Of(canvas.toDataURL("image/jpeg", RECEIPT_IMAGE_QUALITY));
}

async function pdfBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return base64Of(dataUrl);
}

const base64Of = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

const DOCUMENT_URL = `data:image/svg+xml,${encodeURIComponent(receiptDocument.svg)}`;

export function ReceiptScanButton({
  receiptScan,
  fileInput,
}: ReceiptScanProps) {
  const t = useTranslations("expenses.receiptScan");
  const tCommon = useTranslations("common");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  useEffect(() => {
    const keep = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", keep);
    window.addEventListener("drop", keep);
    return () => {
      window.removeEventListener("dragover", keep);
      window.removeEventListener("drop", keep);
    };
  }, []);

  const read = (file: File | undefined) => {
    if (!file) return;
    setIsOpen(false);
    if (file.type === "application/pdf") {
      setPhotoUrl(DOCUMENT_URL);
      void receiptScan.scan(
        "application/pdf",
        () => pdfBase64(file),
        file.size,
      );
      return;
    }
    setPhotoUrl(URL.createObjectURL(file));
    void receiptScan.scan("image/jpeg", () => receiptBase64(file));
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        data-testid="receipt-scan-input"
        onChange={(event) => {
          read(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("title")}
            title={t("title")}
            data-testid="receipt-scan"
          >
            <Camera />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            {t("title")}
            <Badge variant="beta">
              <FlaskConical className="size-3" />
              {tCommon("beta")}
            </Badge>
          </div>
          <button
            type="button"
            data-testid="receipt-scan-choose"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              read(event.dataTransfer.files[0]);
            }}
            className={cn(
              "hover:bg-muted/50 w-full rounded-lg border border-dashed p-4 text-left text-sm",
              isDragging
                ? "border-primary bg-muted"
                : "border-muted-foreground",
            )}
          >
            <span className="font-medium">{t("subtitle")}</span>
            <span className="text-muted-foreground block">
              {t("dropHere")} · {t("chooseFile")}
            </span>
          </button>
          <p className="text-muted-foreground text-xs">{t("disclosure")}</p>
        </PopoverContent>
      </Popover>

      <ReceiptReadingStage
        receiptScan={receiptScan}
        photoUrl={photoUrl}
        marks={photoUrl === DOCUMENT_URL ? receiptDocument.marks : undefined}
      />
    </>
  );
}

export function ReceiptScanFailed({
  receiptScan,
  fileInput,
}: ReceiptScanProps) {
  const t = useTranslations("expenses.receiptScan");
  const { state } = receiptScan;
  if (state.status !== "failed") return null;

  return (
    <Alert
      variant="destructive"
      data-testid="receipt-scan-failed"
      className="flex gap-3"
    >
      <FlatsbyCat
        animate={false}
        className="fc-squint h-9 w-auto shrink-0 -rotate-9"
      />
      <div className="space-y-3">
        <AlertTitle>
          {state.message ? t("failedTitle") : t("unreadableTitle")}
        </AlertTitle>
        <AlertDescription>
          {state.message ?? t("unreadableBody")}
        </AlertDescription>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInput.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          {t("newPhoto")}
        </Button>
      </div>
    </Alert>
  );
}
