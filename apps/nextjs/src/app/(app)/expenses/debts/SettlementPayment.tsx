"use client";

import type { PaymentOptions } from "@flatsby/validators/payment";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Landmark, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "react-qr-code";

import { Button } from "@flatsby/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import { toast } from "@flatsby/ui/toast";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import {
  formatIban,
  girocodePayload,
  paymentOptions,
  paypalMeUrl,
  settlementReference,
} from "@flatsby/validators/payment";

import { useTRPC } from "~/trpc/react";

export function usePaymentOptions(
  groupId: number,
  receiverId: number,
  currency: string,
) {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.group.getMemberPaymentDetails.queryOptions({
      groupId,
      groupMemberId: receiverId,
    }),
    enabled: receiverId > 0,
  });
  return data?.success ? paymentOptions(data.data, currency) : undefined;
}

interface SettlementPaymentProps {
  options: PaymentOptions;
  payerName: string;
  receiverName: string;
  receiverIsMe: boolean;
  amountInCents: number;
  currency: string;
  groupName: string;
}

export function SettlementPayment({
  options,
  payerName,
  receiverName,
  receiverIsMe,
  amountInCents,
  currency,
  groupName,
}: SettlementPaymentProps) {
  const t = useTranslations("debts.pay");
  const locale = useLocale();
  const { bank, paypalHandle, euroOnly } = options;

  const amount = formatCurrencyFromCents({
    cents: amountInCents,
    currency,
    locale,
  });
  const reference = settlementReference(groupName);
  const girocode =
    bank?.girocode && amountInCents > 0
      ? girocodePayload({ ...bank, amountInCents, reference })
      : null;

  if (receiverIsMe) {
    if (girocode) {
      return (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border p-4"
          data-testid="settle-own-girocode"
        >
          <p className="font-semibold">{t("letScan", { name: payerName })}</p>
          <Girocode value={girocode} size={160} />
          <p className="text-muted-foreground text-sm">
            {t("yourCode", { amount })}
          </p>
        </div>
      );
    }
    if (bank || paypalHandle) return null;
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-3"
        data-testid="settle-pay-add-yours"
      >
        <p className="flex-1 text-sm">{t("addYours")}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/user-settings">{t("add")}</Link>
        </Button>
      </div>
    );
  }

  if (!bank && !paypalHandle) {
    return (
      <p
        className="text-muted-foreground text-center text-sm"
        data-testid="settle-pay-no-details"
      >
        {euroOnly ? t("euroOnly") : t("noDetails", { name: receiverName })}
      </p>
    );
  }

  const bankPanel = bank && (
    <div className="flex flex-col gap-3">
      {girocode && (
        <div className="flex items-center gap-4">
          <Girocode value={girocode} size={150} />
          <p className="text-muted-foreground text-sm">{t("scanHint")}</p>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <PaymentRow label={t("to")} value={bank.accountHolder} />
        <PaymentRow
          label={t("iban")}
          value={formatIban(bank.iban)}
          copyValue={bank.iban}
          testId="settle-pay-iban"
          mono
        />
        <PaymentRow
          label={t("reference")}
          value={reference}
          copyValue={reference}
        />
      </div>
      {!bank.girocode && (
        <p className="text-muted-foreground text-xs">{t("eeaOnly")}</p>
      )}
    </div>
  );

  const paypalPanel = paypalHandle && (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {t("paypalHint", { amount })}
      </p>
      {amountInCents > 0 && (
        <Button asChild variant="outline" data-testid="settle-paypal-button">
          <a
            href={paypalMeUrl(paypalHandle, amountInCents, currency)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            {t("openPaypal")}
          </a>
        </Button>
      )}
      {euroOnly && (
        <p className="text-muted-foreground text-xs">{t("euroOnly")}</p>
      )}
    </div>
  );

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-4"
      data-testid="settle-pay-card"
    >
      <p className="font-semibold">{t("title", { name: receiverName })}</p>
      {bankPanel && paypalPanel ? (
        <Tabs defaultValue="bank" className="gap-3">
          <TabsList className="w-full">
            <TabsTrigger value="bank" data-testid="settle-pay-method-bank">
              <Landmark className="h-4 w-4" />
              {t("bankTransfer")}
            </TabsTrigger>
            <TabsTrigger value="paypal" data-testid="settle-pay-method-paypal">
              <Wallet className="h-4 w-4" />
              {t("paypal")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bank">{bankPanel}</TabsContent>
          <TabsContent value="paypal">{paypalPanel}</TabsContent>
        </Tabs>
      ) : (
        (bankPanel ?? paypalPanel)
      )}
    </div>
  );
}

function Girocode({ value, size }: { value: string; size: number }) {
  return (
    <div
      className="shrink-0 rounded-lg bg-white p-2"
      data-testid="settle-girocode"
    >
      <QRCode value={value} size={size} level="M" />
    </div>
  );
}

function PaymentRow({
  label,
  value,
  copyValue,
  testId,
  mono,
}: {
  label: string;
  value: string;
  copyValue?: string;
  testId?: string;
  mono?: boolean;
}) {
  const t = useTranslations("debts.pay");

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-24 shrink-0 text-xs">
        {label}
      </span>
      <span
        className={
          mono ? "flex-1 font-mono text-sm" : "flex-1 text-sm font-medium"
        }
        data-testid={testId}
      >
        {value}
      </span>
      {copyValue !== undefined && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => copy(copyValue)}
          aria-label={`${t("copy")} ${label}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
