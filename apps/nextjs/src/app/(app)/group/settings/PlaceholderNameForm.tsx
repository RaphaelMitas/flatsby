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
  inputId,
  submitLabel,
  inputTestId,
  buttonTestId,
  autoFocus,
  hideSubmitWhenEmpty,
  disabled,
  onTextChange,
  onSubmit,
}: {
  defaultName?: string;
  inputId?: string;
  submitLabel: string;
  inputTestId: string;
  buttonTestId: string;
  autoFocus?: boolean;
  hideSubmitWhenEmpty?: boolean;
  disabled?: boolean;
  onTextChange?: (name: string) => void;
  onSubmit: (name: string) => void;
}) {
  const t = useTranslations("group.placeholders");
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: defaultName },
  });
  const empty = form.watch("name").trim() === "";

  return (
    <Form {...form}>
      <form
        className="flex items-start gap-2"
        onSubmit={(event) => {
          // An optional field with no button: an empty Enter is not a mistake
          if (hideSubmitWhenEmpty && empty) return event.preventDefault();
          void form.handleSubmit(({ name }) => {
            onSubmit(name);
            form.reset();
            onTextChange?.("");
          })(event);
        }}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    onTextChange?.(event.target.value);
                  }}
                  {...(inputId && { id: inputId })}
                  data-testid={inputTestId}
                  autoFocus={autoFocus}
                  disabled={disabled}
                  placeholder={t("namePlaceholder")}
                  maxLength={MAX_PLACEHOLDER_NAME_LENGTH}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!(hideSubmitWhenEmpty && empty) && (
          <Button
            type="submit"
            variant="secondary"
            data-testid={buttonTestId}
            disabled={disabled}
          >
            {submitLabel}
          </Button>
        )}
      </form>
    </Form>
  );
}
