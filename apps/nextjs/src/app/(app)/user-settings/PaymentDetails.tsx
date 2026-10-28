"use client";

import type { PaymentDetailsFormValues } from "@flatsby/validators/payment";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { resultMutation } from "@flatsby/api/resultMutation";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { toast } from "@flatsby/ui/toast";
import {
  paymentDetailsFormSchema,
  paymentDetailsFormValues,
  paymentDetailsInput,
  PAYPAL_ME_SIGNUP_URL,
} from "@flatsby/validators/payment";

import { useTRPC } from "~/trpc/react";

export function PaymentDetails() {
  const trpc = useTRPC();
  const t = useTranslations();
  const queryClient = useQueryClient();

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );
  const { data } = useSuspenseQuery(trpc.user.getPaymentDetails.queryOptions());
  const stored = data.success ? data.data : null;

  const form = useForm<PaymentDetailsFormValues>({
    resolver: zodResolver(paymentDetailsFormSchema),
    defaultValues: paymentDetailsFormValues(stored, user.name),
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
          form.reset(paymentDetailsFormValues(details, user.name));
          toast.success(
            details
              ? t("settings.payment.saved")
              : t("settings.payment.removed"),
          );
        },
        onFailure: (message) =>
          toast.error(message ?? t("errors.updatePaymentDetailsFailed")),
      }),
    ),
  );

  const save = (values: PaymentDetailsFormValues) =>
    mutation.mutate(paymentDetailsInput(values));

  return (
    <Card data-testid="payment-details-card">
      <CardHeader>
        <CardTitle>{t("settings.payment.title")}</CardTitle>
        <CardDescription>{t("settings.payment.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(save)} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings.payment.accountHolder")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="name"
                        data-testid="payment-account-holder-input"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("settings.payment.accountHolderHint")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paypalHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings.payment.paypal")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("settings.payment.paypalPlaceholder")}
                        autoCapitalize="none"
                        data-testid="payment-paypal-input"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("settings.payment.paypalHint")}{" "}
                      <a
                        href={PAYPAL_ME_SIGNUP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {t("settings.payment.paypalSignup")}
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.payment.iban")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="font-mono"
                      data-testid="payment-iban-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              {stored && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      accountHolder: null,
                      iban: null,
                      paypalHandle: null,
                    })
                  }
                  data-testid="payment-remove-button"
                >
                  {t("settings.payment.remove")}
                </Button>
              )}
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="payment-save-button"
              >
                {mutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  t("settings.payment.save")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
