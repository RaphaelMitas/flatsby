"use client";

import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";
import { Dialog, DialogContent, DialogTitle } from "@flatsby/ui/dialog";
import {
  RECEIPT_IMAGE_MAX_EDGE,
  RECEIPT_IMAGE_QUALITY,
} from "@flatsby/validators/expenses/receipt-scan";

import { useTRPC } from "~/trpc/react";
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
  const dataUrl = canvas.toDataURL("image/jpeg", RECEIPT_IMAGE_QUALITY);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export function ReceiptScanCard({ receiptScan }: { receiptScan: ReceiptScan }) {
  const t = useTranslations("expenses.receiptScan");
  const tBilling = useTranslations("billing.pricing");
  const trpc = useTRPC();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { data: usage } = useQuery(trpc.user.getUsage.queryOptions());
  const { state } = receiptScan;
  const outOfCredits = usage?.credits?.balance === 0;

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
    <div className="space-y-2">
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

      {outOfCredits ? (
        <button
          type="button"
          data-testid="receipt-scan-out-of-credits"
          onClick={() => setUpgradeOpen(true)}
          className="bg-muted hover:bg-muted/70 flex w-full items-center gap-3 rounded-lg border p-4 text-left"
        >
          <SleepingCat className="h-9" />
          <div className="flex-1">
            <p className="font-semibold">{t("title")}</p>
            <p className="text-muted-foreground text-sm">{t("outOfCredits")}</p>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </button>
      ) : state.status === "failed" ? (
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
            <p className="font-semibold">
              {isDragging ? t("dropHere") : t("title")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("subtitle")} · {t("chooseFile")}
            </p>
          </div>
        </button>
      )}
      {!outOfCredits && (
        <p className="text-muted-foreground text-xs">{t("disclosure")}</p>
      )}

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent
          data-testid="receipt-scan-upgrade"
          aria-describedby={undefined}
          className="text-center sm:max-w-sm"
        >
          <SleepingCat className="mx-auto h-28" />
          <DialogTitle className="text-center">
            {t("outOfCreditsTitle")}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            {t("outOfCreditsBody")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setUpgradeOpen(false)}
            >
              {t("fillManually")}
            </Button>
            <Button asChild className="flex-1">
              <Link href="/billing">{tBilling("upgrade")}</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptReadingStage receiptScan={receiptScan} photoUrl={photoUrl} />
    </div>
  );
}

function SleepingCat({ className }: { className: string }) {
  const t = useTranslations("home.new.cat");
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <FlatsbyCat animate={false} className="fc-asleep h-full w-auto" />
      <span aria-hidden className="absolute -top-1 -right-2 text-xs">
        <span className="rs-zee">{t("snore")}</span>
        <span className="rs-zee">{t("snore")}</span>
        <span className="rs-zee">{t("snore")}</span>
      </span>
    </span>
  );
}
