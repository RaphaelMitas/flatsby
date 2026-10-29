"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { paypalMeUrl } from "@flatsby/validators/payment";

import { CopyButton } from "~/app/_components/CopyButton";
import { useAnalytics } from "~/hooks/use-analytics";

interface SettlementPaymentProps {
  groupId: number;
  paypalHandle: string | null;
  receiverName: string;
  receiverIsMe: boolean;
  payerIsMe: boolean;
  amountInCents: number;
  currency: string;
}

export function SettlementPayment({
  groupId,
  paypalHandle,
  receiverName,
  receiverIsMe,
  payerIsMe,
  amountInCents,
  currency,
}: SettlementPaymentProps) {
  const t = useTranslations("debts.pay");
  const locale = useLocale();
  const { capture } = useAnalytics();

  if (!paypalHandle) {
    return (
      <div
        className="flex items-center justify-center gap-3"
        data-testid="settle-pay-no-details"
      >
        <p className="text-muted-foreground text-center text-sm">
          {receiverIsMe
            ? t("noPaypalYou")
            : t("noPaypal", { name: receiverName })}
        </p>
        {receiverIsMe && (
          <Button asChild size="sm" variant="outline">
            <Link href="/user-settings">{t("add")}</Link>
          </Button>
        )}
      </div>
    );
  }

  const amount = formatCurrencyFromCents({
    cents: amountInCents,
    currency,
    locale,
  });
  const url = paypalMeUrl(paypalHandle, amountInCents, currency);

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-4"
      data-testid="settle-pay-card"
    >
      <p className="font-semibold">
        {receiverIsMe ? t("yourPaypal") : t("paypalOf", { name: receiverName })}
      </p>
      {url && (
        <>
          {payerIsMe && (
            <p className="text-muted-foreground text-sm">
              {t("paypalHint", { amount })}
            </p>
          )}
          <div className="flex items-center gap-2">
            {payerIsMe && (
              <Button
                asChild
                variant="outline"
                className="flex-1"
                data-testid="settle-paypal-button"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => capture("settle_paypal_opened", { groupId })}
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("openPaypal")}
                </a>
              </Button>
            )}
            <CopyButton
              value={url}
              onCopy={() =>
                capture("settle_paypal_shared", { groupId, method: "copy" })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
