"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent } from "@flatsby/ui/card";

import { useTRPC } from "~/trpc/react";
import { useStoredFlag } from "~/utils/stored-flag";

const dismissedKey = "paypal_nudge_dismissed";

export function PaypalNudgeCard() {
  const trpc = useTRPC();
  const t = useTranslations("debts.pay");
  const { isSet: dismissed, set: dismiss } = useStoredFlag(dismissedKey);
  const { data: user } = useQuery(trpc.user.getCurrentUser.queryOptions());

  if (dismissed || !user || user.paypalHandle) return null;

  return (
    <Card data-testid="paypal-nudge-card">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <p className="font-bold">{t("faster")}</p>
            <p className="text-muted-foreground text-sm">{t("fasterBody")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("fasterDismiss")}
            data-testid="paypal-nudge-dismiss"
            onClick={dismiss}
          >
            <X className="size-4" />
          </Button>
        </div>
        <Button asChild variant="outline" data-testid="paypal-nudge-open">
          <Link href="/user-settings">{t("fasterAction")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
