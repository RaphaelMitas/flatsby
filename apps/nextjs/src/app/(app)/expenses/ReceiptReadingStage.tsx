"use client";

import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";
import { Dialog, DialogContent, DialogTitle } from "@flatsby/ui/dialog";

import "./receipt-stage.css";

type ReceiptScan = ReturnType<typeof useReceiptScan>;

export function ReceiptReadingStage({
  receiptScan,
  photoUrl,
}: {
  receiptScan: ReceiptScan;
  photoUrl?: string;
}) {
  const t = useTranslations("expenses.receiptScan");
  const { phase, revealed } = receiptScan.stage;
  const values = receiptScan.preview;
  const failing = phase === "failing";
  const lensOut = phase === "reading" || phase === "revealing" || failing;
  const caption = t(receiptScan.stage.caption);
  const previewing = phase === "preview";
  const apply = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (previewing) apply.current?.focus();
  }, [previewing]);

  return (
    <Dialog
      open={phase !== "closed" && !!photoUrl}
      onOpenChange={(open) => {
        if (!open) receiptScan.reset();
      }}
    >
      <DialogContent
        data-testid="receipt-scan-stage"
        aria-describedby={undefined}
        className="from-background to-muted inset-0 h-dvh max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-linear-to-b p-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-180 sm:w-105 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border"
      >
        <DialogTitle className="sr-only">{caption}</DialogTitle>
        <div
          className="rs-stage relative flex h-full flex-col items-center"
          data-phase={phase}
        >
          <p className="mt-16 text-center text-base font-semibold">{caption}</p>
          <p aria-live="polite" className="sr-only">
            {previewing && values
              ? [values.store, values.amount, values.date]
                  .filter(Boolean)
                  .join(", ")
              : caption}
          </p>
          <div className="mt-2 flex min-h-7 flex-wrap justify-center gap-1.5 px-6">
            {!failing &&
              revealed.map((tag) => (
                <span
                  key={tag}
                  className="rs-tag bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs"
                >
                  <span className="opacity-60">{t(tag)} </span>
                  <span className="font-semibold">{values?.[tag]}</span>
                </span>
              ))}
          </div>

          <div className="rs-photo relative mt-4">
            {photoUrl && (
              // biome-ignore lint/performance/noImgElement: a local object URL, sized from its natural dimensions
              <img
                src={photoUrl}
                alt=""
                className="max-h-82 max-w-65 rounded-md shadow-xl"
                onLoad={(event) => {
                  // The lens keyframes size and place the magnified copy from these
                  const { width, height } = event.currentTarget;
                  const frame = event.currentTarget.parentElement;
                  frame?.style.setProperty("--w", `${width}px`);
                  frame?.style.setProperty("--h", `${height}px`);
                }}
              />
            )}
            <div
              className="rs-lens"
              style={{ backgroundImage: `url(${photoUrl})` }}
            />
          </div>

          <div className="rs-cat pointer-events-none absolute bottom-6">
            <div key={revealed.length} className="rs-nod">
              <FlatsbyCat
                className={cn(
                  "h-36 w-auto",
                  failing && "fc-squint",
                  lensOut && "fc-no-monocle",
                )}
              />
            </div>
          </div>

          <div
            data-testid="receipt-scan-preview"
            className="rs-panel absolute inset-x-2 bottom-2"
            inert={!previewing}
            aria-hidden={!previewing}
          >
            <div className="pointer-events-none absolute -top-14 left-1/2 h-14 -translate-x-1/2 overflow-hidden">
              <div className="rs-peek">
                <FlatsbyCat className="h-28 w-auto" />
              </div>
            </div>
            <div className="bg-background/90 space-y-3 rounded-4xl border p-6 shadow-xl backdrop-blur">
              <p className="text-lg font-semibold">{t("previewTitle")}</p>
              <PreviewRow label={t("store")} value={values?.store} />
              <PreviewRow label={t("amount")} value={values?.amount} />
              <PreviewRow label={t("date")} value={values?.date} />
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  data-testid="receipt-scan-discard"
                  onClick={receiptScan.reset}
                >
                  {t("discard")}
                </Button>
                <Button
                  ref={apply}
                  type="button"
                  className="flex-1"
                  data-testid="receipt-scan-apply"
                  onClick={receiptScan.apply}
                >
                  {t("apply")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const t = useTranslations("expenses.receiptScan");
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={value ? "font-semibold" : "text-warning"}>
        {value ?? t("notFound")}
      </span>
    </div>
  );
}
