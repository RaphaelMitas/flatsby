import { Linking, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useLocale, useTranslations } from "use-intl";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { paypalMeUrl } from "@flatsby/validators/payment";

import { Button } from "~/lib/ui/button";

interface SettlementPaymentProps {
  paypalHandle: string | null;
  receiverName: string;
  receiverIsMe: boolean;
  payerIsMe: boolean;
  amountInCents: number;
  currency: string;
}

export function SettlementPayment({
  paypalHandle,
  receiverName,
  receiverIsMe,
  payerIsMe,
  amountInCents,
  currency,
}: SettlementPaymentProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

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
          {payerIsMe && (
            <Text className="text-muted-foreground text-sm">
              {t("debts.pay.paypalHint", { amount })}
            </Text>
          )}
          <View className="flex-row gap-2">
            {payerIsMe && (
              <Button
                testID="settle-paypal-button"
                title={t("debts.pay.openPaypal")}
                icon="external-link"
                variant="outline"
                className="flex-1"
                onPress={() => Linking.openURL(url)}
              />
            )}
            <Button
              testID="settle-paypal-share"
              title={t("debts.pay.share")}
              icon="share"
              variant="outline"
              className="flex-1"
              onPress={() =>
                Share.share({
                  message: t("debts.pay.shareMessage", { amount, url }),
                })
              }
            />
          </View>
        </>
      )}
    </View>
  );
}
