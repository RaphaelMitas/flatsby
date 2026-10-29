"use client";

import type { UpdateUserNameFormValues } from "@flatsby/validators/user";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  useForm,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { updateUserNameFormSchema } from "@flatsby/validators/user";

import { useTRPC } from "~/trpc/react";

export default function NameForm({
  defaultName,
  next,
}: {
  defaultName: string;
  next: string;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm({
    schema: updateUserNameFormSchema,
    defaultValues: { name: defaultName },
  });

  const updateName = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (result) => {
        if (!result.success) {
          form.setError("name", { message: result.error.message });
          return;
        }
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUser.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
        router.replace(next);
      },
      onError: (err) => form.setError("name", { message: err.message }),
    }),
  );

  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <Form {...form}>
        <form
          className="bg-muted flex w-full max-w-sm flex-col gap-4 rounded-lg p-8"
          onSubmit={form.handleSubmit((values: UpdateUserNameFormValues) =>
            updateName.mutate({ name: values.name.trim() }),
          )}
        >
          <h1 className="text-xl font-semibold">{t("auth.name.title")}</h1>
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    autoComplete="name"
                    aria-label={t("auth.name.placeholder")}
                    placeholder={t("auth.name.placeholder")}
                    className="bg-background"
                    data-testid="auth-name-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-sm">{t("auth.name.hint")}</p>
          <Button
            type="submit"
            data-testid="auth-name-continue"
            disabled={updateName.isPending}
          >
            {updateName.isPending && <LoadingSpinner className="mr-2" />}
            {t("auth.name.continue")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
