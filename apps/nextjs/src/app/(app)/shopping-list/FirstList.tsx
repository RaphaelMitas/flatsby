"use client";

import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingBasket } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { failureOf } from "@flatsby/api/resultMutation";
import { Button } from "@flatsby/ui/button";
import { Form } from "@flatsby/ui/form";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { ListNameField, useCreateList } from "./ListDialogs";

const PRESETS = ["groceries", "drugstore", "hardware"] as const;

export function FirstList({
  groupId,
  groupName,
}: {
  groupId: number;
  groupName: string;
}) {
  const t = useTranslations("shoppingList");
  const createList = useCreateList(groupId);
  const failure = failureOf(createList, t("create.failed"));
  const form = useForm<ShoppingListFormValues>({
    resolver: zodResolver(shoppingListFormSchema),
    defaultValues: { name: "" },
  });

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center">
      <ShoppingBasket className="text-muted-foreground size-12" />
      <h1 className="text-xl font-bold" data-testid="first-list-title">
        {t("firstList.title")}
      </h1>
      <p className="text-muted-foreground text-sm">
        {t("firstList.body", { group: groupName })}
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(({ name }) =>
            createList.mutate({ groupId, name: name.trim() }),
          )}
          className="flex w-full flex-col gap-3"
        >
          <ListNameField
            control={form.control}
            testId="first-list-input"
            placeholder={t("listNameLabel")}
          />
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                data-testid={`first-list-preset-${preset}`}
                onClick={() =>
                  form.setValue("name", t(`firstList.presets.${preset}`))
                }
              >
                {t(`firstList.presets.${preset}`)}
              </Button>
            ))}
          </div>
          <Button
            type="submit"
            data-testid="first-list-create"
            disabled={createList.isPending}
          >
            {t("create.createList")}
          </Button>
          {failure && <p className="text-destructive text-sm">{failure}</p>}
        </form>
      </Form>
    </div>
  );
}
