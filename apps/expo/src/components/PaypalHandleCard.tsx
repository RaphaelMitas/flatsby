import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { failureOf, resultMutation } from "@flatsby/api/resultMutation";
import {
  PAYPAL_ME_SIGNUP_URL,
  paypalHandleInputSchema,
} from "@flatsby/validators/payment";

import { TimedAlert } from "~/components/TimedAlert";
import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
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

// Loads on its own so the rest of Profile never waits on it, offline included
export function PaypalHandleCard() {
  const { data } = useQuery(trpc.user.getPaypalHandle.queryOptions());
  if (!data) return null;
  return <PaypalHandleForm stored={data.success ? data.data : null} />;
}

function PaypalHandleForm({ stored }: { stored: string | null }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<"saved" | "removed" | null>(null);

  const form = useForm({
    schema: paypalHandleInputSchema,
    // Follows a newer save from another device without dropping what's being typed
    values: { paypalHandle: stored ?? "" },
    resetOptions: { keepDirtyValues: true },
  });

  const mutation = useMutation(
    trpc.user.updatePaypalHandle.mutationOptions(
      resultMutation({
        onSuccess: (paypalHandle) => {
          void queryClient.invalidateQueries(
            trpc.user.getPaypalHandle.queryFilter(),
          );
          void queryClient.invalidateQueries(trpc.group.getGroup.pathFilter());
          form.reset({ paypalHandle: paypalHandle ?? "" });
          setNotice(paypalHandle ? "saved" : stored ? "removed" : null);
        },
      }),
    ),
  );

  const failure = failureOf(mutation, t("errors.updatePaypalHandleFailed"));

  const save = (paypalHandle: string) => {
    setNotice(null);
    mutation.mutate({ paypalHandle });
  };

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t("settings.payment.title")}</CardTitle>
        <CardDescription>{t("settings.payment.description")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Form {...form}>
          <View className="gap-4">
            <Alert variant="info">
              <View className="flex-row items-center gap-2">
                <Icon name="eye" size={16} color="info" />
                <AlertTitle variant="info" className="mb-0 flex-1">
                  {t("settings.payment.visibleTitle")}
                </AlertTitle>
              </View>
              <AlertDescription className="mt-1">
                {t("settings.payment.visibleBody")}
              </AlertDescription>
            </Alert>
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
                  onPress={() => save("")}
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
                onPress={form.handleSubmit(({ paypalHandle }) =>
                  save(paypalHandle),
                )}
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
