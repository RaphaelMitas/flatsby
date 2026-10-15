"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";

interface UIConfirmationProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  hasResponded?: boolean;
  wasConfirmed?: boolean;
}

export function UIConfirmation({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  disabled = false,
  onConfirm,
  onCancel,
  hasResponded = false,
  wasConfirmed,
}: UIConfirmationProps) {
  const t = useTranslations();

  // Show read-only state if already responded
  if (hasResponded && wasConfirmed !== undefined) {
    return (
      <Card className="my-2 max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            {destructive && (
              <AlertTriangle className="size-4 text-yellow-500" />
            )}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={title ? "pt-0" : ""}>
          <p className="text-muted-foreground mb-2 text-sm">{message}</p>
          <div className="flex items-center gap-2 text-sm">
            {wasConfirmed ? (
              <>
                <Check className="size-4 text-green-500" />
                <span>{t("chat.toolResults.ui.confirmed")}</span>
              </>
            ) : (
              <>
                <X className="size-4 text-red-500" />
                <span>{t("chat.toolResults.ui.cancelled")}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2 max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {destructive && <AlertTriangle className="size-4 text-yellow-500" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={title ? "pt-0" : ""}>
        <p className="text-muted-foreground mb-3 text-sm">{message}</p>
        <div className="flex gap-2">
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            disabled={disabled}
            onClick={onConfirm}
          >
            {confirmLabel ?? t("chat.toolResults.ui.confirm")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onCancel}
          >
            {cancelLabel ?? t("common.cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
