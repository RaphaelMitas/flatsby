"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { Button } from "@flatsby/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import {
  MAX_PLACEHOLDER_NAME_LENGTH,
  placeholderNameSchema,
} from "@flatsby/validators/group";

const formSchema = z.object({ name: placeholderNameSchema });

export function PlaceholderNameForm({
  defaultName = "",
  submitLabel,
  inputTestId,
  buttonTestId,
  autoFocus,
  onSubmit,
}: {
  defaultName?: string;
  submitLabel: string;
  inputTestId: string;
  buttonTestId: string;
  autoFocus?: boolean;
  onSubmit: (name: string) => void;
}) {
  const t = useTranslations("group.placeholders");
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: defaultName },
  });

  return (
    <Form {...form}>
      <form
        className="flex items-start gap-2"
        onSubmit={form.handleSubmit(({ name }) => {
          onSubmit(name);
          form.reset();
        })}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  {...field}
                  data-testid={inputTestId}
                  autoFocus={autoFocus}
                  placeholder={t("namePlaceholder")}
                  maxLength={MAX_PLACEHOLDER_NAME_LENGTH}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="secondary" data-testid={buttonTestId}>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
