"use client";

import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Camera,
  ChevronRight,
  LoaderCircle,
  Lock,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flatsby/ui/dialog";
import {
  RECEIPT_IMAGE_MAX_EDGE,
  RECEIPT_IMAGE_QUALITY,
} from "@flatsby/validators/expenses/receipt-scan";

import { useTRPC } from "~/trpc/react";

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
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", RECEIPT_IMAGE_QUALITY);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export function ReceiptScanCard({ receiptScan }: { receiptScan: ReceiptScan }) {
  const t = useTranslations("expenses.receiptScan");
  const trpc = useTRPC();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const { data: usage } = useQuery(trpc.user.getUsage.queryOptions());
  const { state, preview } = receiptScan;

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
    setPhotoUrl(URL.createObjectURL(file));
    void receiptScan.scan(() => receiptBase64(file));
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="receipt-scan-input"
        onChange={(event) => {
          read(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {state.status === "reading" ? (
        <div
          data-testid="receipt-scan-reading"
          className="bg-muted flex items-center gap-3 rounded-lg border p-3"
        >
          {photoUrl && (
            <Image
              src={photoUrl}
              alt=""
              width={36}
              height={48}
              unoptimized
              className="h-12 w-9 rounded object-cover"
            />
          )}
          <div className="flex-1">
            <p className="font-semibold">{t("reading")}</p>
            <p className="text-muted-foreground text-sm">{t("readingHint")}</p>
          </div>
          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : state.status === "failed" ? (
        <Alert variant="destructive" data-testid="receipt-scan-failed">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {state.message ? t("failedTitle") : t("unreadableTitle")}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{state.message ?? t("unreadableBody")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {t("newPhoto")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : usage?.credits?.balance === 0 ? (
        <Link
          href="/billing"
          data-testid="receipt-scan-out-of-credits"
          className="bg-muted hover:bg-muted/70 flex items-center gap-3 rounded-lg border p-4"
        >
          <div className="bg-background flex h-10 w-10 items-center justify-center rounded-lg">
            <Lock className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">{t("title")}</p>
            <p className="text-muted-foreground text-sm">{t("outOfCredits")}</p>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </Link>
      ) : (
        <div className="space-y-2">
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
            className={`hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border border-dashed p-4 text-left ${
              isDragging ? "border-primary bg-muted" : "border-muted-foreground"
            }`}
          >
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <Camera className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {isDragging ? t("dropHere") : t("title")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("subtitle")} · {t("chooseFile")}
              </p>
            </div>
          </button>
          <p className="text-muted-foreground text-xs">{t("disclosure")}</p>
        </div>
      )}

      <Dialog
        open={state.status === "found"}
        onOpenChange={(open) => {
          if (!open) receiptScan.reset();
        }}
      >
        <DialogContent data-testid="receipt-scan-preview">
          <DialogHeader>
            <DialogTitle>{t("previewTitle")}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-2 text-sm">
              <PreviewRow label={t("store")} value={preview.store} />
              <PreviewRow label={t("amount")} value={preview.amount} />
              <PreviewRow label={t("date")} value={preview.date} />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-testid="receipt-scan-discard"
              onClick={receiptScan.reset}
            >
              {t("discard")}
            </Button>
            <Button
              type="button"
              data-testid="receipt-scan-apply"
              onClick={receiptScan.apply}
            >
              {t("apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreviewRow({ label, value }: { label: string; value: string | null }) {
  const t = useTranslations("expenses.receiptScan");
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={value ? "font-semibold" : "text-warning"}>
        {value ?? t("notFound")}
      </span>
    </div>
  );
}
