import type { PaymentOptions } from "@flatsby/validators/payment";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import QRCode from "react-qr-code";
import { useLocale, useTranslations } from "use-intl";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { formatIban, settlePaymentView } from "@flatsby/validators/payment";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Segmented } from "~/lib/ui/segmented";

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
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { bank, paypalHandle, euroOnly } = options;
  const [method, setMethod] = useState<"bank" | "paypal">("bank");
  const [showCode, setShowCode] = useState(false);

  const amount = formatCurrencyFromCents({
    cents: amountInCents,
    currency,
    locale,
  });
  const view = settlePaymentView(options, {
    amountInCents,
    currency,
    groupName,
    receiverIsMe,
  });

  if (view.kind === "ownCode") {
    return (
      <View
        testID="settle-own-girocode"
        className="border-border items-center gap-3 rounded-lg border p-4"
      >
        <Text className="text-foreground font-semibold">
          {t("debts.pay.letScan", { name: payerName })}
        </Text>
        <Girocode value={view.girocode} size={160} />
        <Text className="text-muted-foreground text-sm">
          {t("debts.pay.yourCode", { amount })}
        </Text>
      </View>
    );
  }
  if (view.kind === "hidden") return null;
  if (view.kind === "addYours") {
    return (
      <View
        testID="settle-pay-add-yours"
        className="border-border flex-row items-center gap-3 rounded-lg border border-dashed p-3"
      >
        <Text className="text-foreground flex-1 text-sm">
          {t("debts.pay.addYours")}
        </Text>
        <Button
          size="sm"
          variant="outline"
          title={t("debts.pay.add")}
          onPress={() => router.push("/settings/profile")}
        />
      </View>
    );
  }

  if (view.kind === "unavailable") {
    return (
      <Text
        testID="settle-pay-no-details"
        className="text-muted-foreground text-center text-sm"
      >
        {euroOnly
          ? t("debts.pay.euroOnly")
          : t("debts.pay.noDetails", { name: receiverName })}
      </Text>
    );
  }

  const { reference, girocode, paypalUrl } = view;

  const bankPanel = bank && (
    <View>
      <PaymentRow label={t("debts.pay.to")} value={bank.accountHolder} />
      <PaymentRow
        label={t("debts.pay.iban")}
        value={formatIban(bank.iban)}
        copyValue={bank.iban}
        testID="settle-pay-iban"
        mono
      />
      <PaymentRow
        label={t("debts.pay.reference")}
        value={reference}
        copyValue={reference}
      />
      {girocode ? (
        <>
          <Pressable
            testID="settle-pay-show-code"
            accessibilityRole="button"
            onPress={() => setShowCode((open) => !open)}
            className="border-border flex-row items-center justify-between border-t pt-3"
          >
            <Text className="text-foreground text-sm font-medium">
              {showCode ? t("debts.pay.hideCode") : t("debts.pay.showCode")}
            </Text>
            <Icon
              name={showCode ? "chevron-up" : "chevron-down"}
              size={18}
              color="muted-foreground"
            />
          </Pressable>
          {showCode && (
            <View className="items-center gap-2 pt-3">
              <Girocode value={girocode} size={180} />
              <Text className="text-muted-foreground text-center text-xs">
                {t("debts.pay.scanHint")}
              </Text>
            </View>
          )}
        </>
      ) : (
        !bank.girocode && (
          <Text className="text-muted-foreground pt-2 text-xs">
            {t("debts.pay.eeaOnly")}
          </Text>
        )
      )}
    </View>
  );

  const paypalPanel = paypalHandle && (
    <View className="gap-3">
      <Text className="text-muted-foreground text-sm">
        {t("debts.pay.paypalHint", { amount })}
      </Text>
      {paypalUrl && (
        <Button
          testID="settle-paypal-button"
          title={t("debts.pay.openPaypal")}
          icon="external-link"
          variant="outline"
          onPress={() => Linking.openURL(paypalUrl)}
        />
      )}
      {euroOnly && (
        <Text className="text-muted-foreground text-xs">
          {t("debts.pay.euroOnly")}
        </Text>
      )}
    </View>
  );

  return (
    <View
      testID="settle-pay-card"
      className="border-border gap-3 rounded-lg border p-4"
    >
      <Text className="text-foreground font-semibold">
        {t("debts.pay.title", { name: receiverName })}
      </Text>
      {bankPanel && paypalPanel && (
        <Segmented
          value={method}
          onChange={setMethod}
          options={[
            {
              value: "bank",
              label: t("debts.pay.bankTransfer"),
              icon: "landmark",
              testID: "settle-pay-method-bank",
            },
            {
              value: "paypal",
              label: t("debts.pay.paypal"),
              icon: "wallet",
              testID: "settle-pay-method-paypal",
            },
          ]}
        />
      )}

      {bankPanel && paypalPanel
        ? method === "bank"
          ? bankPanel
          : paypalPanel
        : (bankPanel ?? paypalPanel)}
    </View>
  );
}

function Girocode({ value, size }: { value: string; size: number }) {
  return (
    <View testID="settle-girocode" className="rounded-lg bg-white p-3">
      <QRCode value={value} size={size} level="M" />
    </View>
  );
}

function PaymentRow({
  label,
  value,
  copyValue,
  testID,
  mono,
}: {
  label: string;
  value: string;
  copyValue?: string;
  testID?: string;
  mono?: boolean;
}) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View className="flex-row items-center gap-2 py-1.5">
      <Text className="text-muted-foreground w-24 text-xs">{label}</Text>
      <Text
        testID={testID}
        selectable
        className={
          mono
            ? "text-foreground flex-1 font-mono text-xs"
            : "text-foreground flex-1 text-sm font-medium"
        }
      >
        {value}
      </Text>
      {copyValue !== undefined && (
        <Button
          size="sm"
          variant="outline"
          title={copied ? t("common.copied") : t("common.copy")}
          onPress={() => copy(copyValue)}
        />
      )}
    </View>
  );
}
