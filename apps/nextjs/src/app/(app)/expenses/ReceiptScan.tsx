"use client";

import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import { useEffect, useRef, useState } from "react";
import { Camera, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Badge } from "@flatsby/ui/badge";
import { Button } from "@flatsby/ui/button";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";
import { receiptDocument } from "@flatsby/validators/expenses/receipt-document";
import {
  RECEIPT_IMAGE_MAX_EDGE,
  RECEIPT_IMAGE_QUALITY,
} from "@flatsby/validators/expenses/receipt-scan";

import { ReceiptReadingStage } from "./ReceiptReadingStage";

type ReceiptScan = ReturnType<typeof useReceiptScan>;

async function receiptBase64(file: File) {
  // Browsers that can't decode a format (HEIC outside Safari) reject here
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
  // JPEG has no alpha, so a transparent e-receipt would otherwise turn black
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

export function ReceiptScanCard({ receiptScan }: { receiptScan: ReceiptScan }) {
  const t = useTranslations("expenses.receiptScan");
  const tCommon = useTranslations("common");
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const { state } = receiptScan;

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  // A file dropped beside the card would otherwise open in the tab and lose the form
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
    <div className="space-y-2">
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

      {state.status === "failed" ? (
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
      ) : (
        <button
          type="button"
          data-testid="receipt-scan"
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
            "hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border border-dashed p-4 text-left",
            isDragging ? "border-primary bg-muted" : "border-muted-foreground",
          )}
        >
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <Camera className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold">
              {isDragging ? t("dropHere") : t("title")}
              <Badge variant="beta">
                <FlaskConical className="size-3" />
                {tCommon("beta")}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("subtitle")} · {t("chooseFile")}
            </p>
          </div>
        </button>
      )}
      <p className="text-muted-foreground text-xs">{t("disclosure")}</p>

      <ReceiptReadingStage
        receiptScan={receiptScan}
        photoUrl={photoUrl}
        marks={photoUrl === DOCUMENT_URL ? receiptDocument.marks : undefined}
      />
    </div>
  );
}
