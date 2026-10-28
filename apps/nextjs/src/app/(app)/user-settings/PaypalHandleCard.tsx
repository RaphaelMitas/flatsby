"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Eye, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { resultMutation } from "@flatsby/api/resultMutation";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
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
  PAYPAL_ME_SIGNUP_URL,
  paypalHandleInputSchema,
} from "@flatsby/validators/payment";

import { useTRPC } from "~/trpc/react";

export function PaypalHandleCard() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.user.getPaypalHandle.queryOptions());
  // An empty form after a failed load would clear the stored name on Save
  if (!data.success) return null;
  return <PaypalHandleForm stored={data.data} />;
}

function PaypalHandleForm({ stored }: { stored: string | null }) {
  const trpc = useTRPC();
  const t = useTranslations();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(paypalHandleInputSchema),
    // Follows a newer save from another tab without dropping what's being typed
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
          // reset() applies resetOptions too, which would keep the raw pasted link
          form.reset(
            { paypalHandle: paypalHandle ?? "" },
            { keepDirtyValues: false },
          );
          if (paypalHandle) toast.success(t("settings.payment.saved"));
          else if (stored) toast.success(t("settings.payment.removed"));
        },
        onFailure: (message) =>
          toast.error(message ?? t("errors.updatePaypalHandleFailed")),
      }),
    ),
  );

  const save = (paypalHandle: string) => mutation.mutate({ paypalHandle });

  return (
    <Card data-testid="payment-details-card">
      <CardHeader>
        <CardTitle>{t("settings.payment.title")}</CardTitle>
        <CardDescription>{t("settings.payment.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(({ paypalHandle }) =>
              save(paypalHandle),
            )}
            className="grid gap-4"
          >
            <Alert variant="info" data-testid="payment-visibility-notice">
              <Eye className="h-4 w-4" />
              <AlertTitle>{t("settings.payment.visibleTitle")}</AlertTitle>
              <AlertDescription>
                {t("settings.payment.visibleBody")}
              </AlertDescription>
            </Alert>
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
            <div className="flex justify-end gap-2">
              {stored && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => save("")}
                  data-testid="payment-remove-button"
                >
                  {t("common.remove")}
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
                  t("common.save")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
