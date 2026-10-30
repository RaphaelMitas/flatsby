"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { paypalMeUrl } from "@flatsby/validators/payment";

import { CopyButton } from "~/app/_components/CopyButton";

interface SettlementPaymentProps {
  paypalHandle: string | null;
  payerName: string;
  receiverName: string;
  receiverIsMe: boolean;
  payerIsMe: boolean;
  amountInCents: number;
  currency: string;
}

export function SettlementPayment({
  paypalHandle,
  payerName,
  receiverName,
  receiverIsMe,
  payerIsMe,
  amountInCents,
  currency,
}: SettlementPaymentProps) {
  const t = useTranslations("debts.pay");
  const locale = useLocale();

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
  const hint = payerIsMe
    ? t("paypalHint", { amount })
    : receiverIsMe
      ? t("shareHintYou", { payer: payerName, amount })
      : t("shareHint", { payer: payerName, receiver: receiverName, amount });

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
          <p className="text-muted-foreground text-sm">{hint}</p>
          <div className="flex items-center gap-2">
            {payerIsMe ? (
              <Button
                asChild
                variant="outline"
                className="flex-1"
                data-testid="settle-paypal-button"
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("openPaypal")}
                </a>
              </Button>
            ) : (
              <p className="bg-muted text-muted-foreground flex h-8 min-w-0 flex-1 items-center rounded-md px-3 text-sm select-all">
                <span className="truncate">{url.replace("https://", "")}</span>
              </p>
            )}
            <CopyButton value={url} />
          </div>
        </>
      )}
    </div>
  );
}
