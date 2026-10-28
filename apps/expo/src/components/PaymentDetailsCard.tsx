import type { PaymentDetailsFormValues } from "@flatsby/validators/payment";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { failureOf, resultMutation } from "@flatsby/api/resultMutation";
import {
  paymentDetailsFormSchema,
  paymentDetailsFormValues,
  paymentDetailsInput,
  PAYPAL_ME_SIGNUP_URL,
} from "@flatsby/validators/payment";

import { TimedAlert } from "~/components/TimedAlert";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
  useForm,
} from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";

export function PaymentDetailsCard({ userName }: { userName: string }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<"saved" | "removed" | null>(null);

  const { data } = useSuspenseQuery(trpc.user.getPaymentDetails.queryOptions());
  const stored = data.success ? data.data : null;

  const form = useForm({
    schema: paymentDetailsFormSchema,
    defaultValues: paymentDetailsFormValues(stored, userName),
  });

  const mutation = useMutation(
    trpc.user.updatePaymentDetails.mutationOptions(
      resultMutation({
        onSuccess: (details) => {
          void queryClient.invalidateQueries(
            trpc.user.getPaymentDetails.queryFilter(),
          );
          void queryClient.invalidateQueries({
            queryKey: trpc.group.getMemberPaymentDetails.pathKey(),
          });
          form.reset(paymentDetailsFormValues(details, userName));
          setNotice(details ? "saved" : stored ? "removed" : null);
        },
      }),
    ),
  );

  const failure = failureOf(mutation, t("errors.updatePaymentDetailsFailed"));

  const save = (values: PaymentDetailsFormValues) => {
    setNotice(null);
    mutation.mutate(paymentDetailsInput(values, form.formState.dirtyFields));
  };

  const remove = () => {
    setNotice(null);
    mutation.mutate({ accountHolder: null, iban: null, paypalHandle: null });
  };

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t("settings.payment.title")}</CardTitle>
        <CardDescription>{t("settings.payment.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <View className="gap-4">
            <FormField
              name="accountHolder"
              control={form.control}
              render={({ field }) => (
                <View className="gap-2">
                  <Label>{t("settings.payment.accountHolder")}</Label>
                  <FormControl>
                    <Input
                      testID="payment-account-holder-input"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="words"
                      autoComplete="name"
                      error={!!form.formState.errors.accountHolder}
                    />
                  </FormControl>
                  <Text className="text-muted-foreground text-xs">
                    {t("settings.payment.accountHolderHint")}
                  </Text>
                  <FormMessage />
                </View>
              )}
            />
            <FormField
              name="iban"
              control={form.control}
              render={({ field }) => (
                <View className="gap-2">
                  <Label>{t("settings.payment.iban")}</Label>
                  <FormControl>
                    <Input
                      testID="payment-iban-input"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      className="font-mono"
                      error={!!form.formState.errors.iban}
                    />
                  </FormControl>
                  <FormMessage />
                </View>
              )}
            />
            <FormField
              name="paypalHandle"
              control={form.control}
              render={({ field }) => (
                <View className="gap-2">
                  <Label>{t("settings.payment.paypal")}</Label>
                  <FormControl>
                    <Input
                      testID="payment-paypal-input"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder={t("settings.payment.paypalPlaceholder")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={!!form.formState.errors.paypalHandle}
                    />
                  </FormControl>
                  <Text className="text-muted-foreground text-xs">
                    {t("settings.payment.paypalHint")}
                  </Text>
                  <FormMessage />
                  <Button
                    variant="link"
                    size="sm"
                    className="self-start px-0"
                    title={t("settings.payment.paypalSignup")}
                    onPress={() => Linking.openURL(PAYPAL_ME_SIGNUP_URL)}
                  />
                </View>
              )}
            />

            <View className="flex-row gap-2">
              {stored && (
                <Button
                  testID="payment-remove-button"
                  variant="outline"
                  title={t("common.remove")}
                  disabled={mutation.isPending}
                  onPress={remove}
                  className="flex-1"
                />
              )}
              <Button
                testID="payment-save-button"
                icon={mutation.isPending ? "loader" : "save"}
                title={
                  mutation.isPending ? t("common.saving") : t("common.save")
                }
                disabled={mutation.isPending}
                onPress={form.handleSubmit(save)}
                className="flex-1"
              />
            </View>
          </View>
        </Form>

        {failure !== undefined && (
          <TimedAlert
            variant="destructive"
            title={t("common.error")}
            description={failure}
          />
        )}
        {notice && (
          <TimedAlert
            variant="success"
            title={t("settings.profile.success")}
            description={
              notice === "saved"
                ? t("settings.payment.saved")
                : t("settings.payment.removed")
            }
            onDismiss={() => setNotice(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
