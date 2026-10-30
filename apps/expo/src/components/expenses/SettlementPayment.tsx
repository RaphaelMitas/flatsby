import { Linking, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useLocale, useTranslations } from "use-intl";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { paypalMeUrl } from "@flatsby/validators/payment";

import { Button } from "~/lib/ui/button";

interface SettlementPaymentProps {
  groupId: number;
  paypalHandle: string | null;
  payerName: string;
  receiverName: string;
  receiverIsMe: boolean;
  payerIsMe: boolean;
  amountInCents: number;
  currency: string;
}

export function SettlementPayment({
  groupId,
  paypalHandle,
  payerName,
  receiverName,
  receiverIsMe,
  payerIsMe,
  amountInCents,
  currency,
}: SettlementPaymentProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const posthog = usePostHog();

  if (!paypalHandle) {
    return (
      <View
        testID="settle-pay-no-details"
        className="flex-row items-center justify-center gap-3"
      >
        <Text className="text-muted-foreground shrink text-center text-sm">
          {receiverIsMe
            ? t("debts.pay.noPaypalYou")
            : t("debts.pay.noPaypal", { name: receiverName })}
        </Text>
        {receiverIsMe && (
          <Button
            size="sm"
            variant="outline"
            title={t("debts.pay.add")}
            onPress={() =>
              router.navigate("/(tabs)/settings/profile", { withAnchor: true })
            }
          />
        )}
      </View>
    );
  }

  const amount = formatCurrencyFromCents({
    cents: amountInCents,
    currency,
    locale,
  });
  const url = paypalMeUrl(paypalHandle, amountInCents, currency);
  const hint = payerIsMe
    ? t("debts.pay.paypalHint", { amount })
    : receiverIsMe
      ? t("debts.pay.shareHintYou", { payer: payerName, amount })
      : t("debts.pay.shareHint", {
          payer: payerName,
          receiver: receiverName,
          amount,
        });

  return (
    <View
      testID="settle-pay-card"
      className="border-border gap-3 rounded-lg border p-4"
    >
      <Text className="text-foreground font-semibold">
        {receiverIsMe
          ? t("debts.pay.yourPaypal")
          : t("debts.pay.paypalOf", { name: receiverName })}
      </Text>
      {url && (
        <>
          <Text className="text-muted-foreground text-sm">{hint}</Text>
          <View className="flex-row gap-2">
            {payerIsMe && (
              <Button
                testID="settle-paypal-button"
                title={t("debts.pay.openPaypal")}
                icon="external-link"
                variant="outline"
                className="flex-1"
                onPress={() => {
                  posthog.capture("settle_paypal_opened", { groupId });
                  void Linking.openURL(url);
                }}
              />
            )}
            <Button
              testID="settle-paypal-share"
              title={t("debts.pay.share")}
              icon="share"
              variant="outline"
              className="flex-1"
              onPress={async () => {
                const result = await Share.share({
                  message: t("debts.pay.shareMessage", { amount, url }),
                });
                if (result.action === Share.sharedAction) {
                  posthog.capture("settle_paypal_shared", {
                    groupId,
                    method: "share_sheet",
                  });
                }
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}
