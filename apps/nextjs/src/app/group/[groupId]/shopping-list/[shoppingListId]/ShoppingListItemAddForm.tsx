"use client";

import type { z } from "zod/v4";
import { useRef } from "react";

import { Button } from "@flatsby/ui/button";
import { Form, FormField, useForm } from "@flatsby/ui/form";
import { createShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { CategorySelector } from "./CategorySelector";
import { ShoppingListItemInputFormField } from "./ShoppingListItemInputFormField";

interface ShoppingListItemAddFormProps {
  onSubmit: (values: z.infer<typeof createShoppingListItemFormSchema>) => void;
}

type FormValues = z.infer<typeof createShoppingListItemFormSchema>;

export const ShoppingListItemAddForm = ({
  onSubmit,
}: ShoppingListItemAddFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useForm<FormValues, FormValues>({
    schema: createShoppingListItemFormSchema,
    defaultValues: {
      name: "",
      categoryId: "ai-auto-select",
    },
  });
  const handleSubmit = (
    values: z.infer<typeof createShoppingListItemFormSchema>,
  ) => {
    form.reset({
      name: "",
      categoryId: "ai-auto-select",
    });

    onSubmit(values);
    inputRef.current?.focus();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => form.handleSubmit(handleSubmit)(e)}
        className="bg-background sticky bottom-0 p-4"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <ShoppingListItemInputFormField
                  ref={inputRef}
                  field={field}
                  onCategoryDetected={(categoryId) => {
                    form.setValue("categoryId", categoryId);
                  }}
                />
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <CategorySelector
                  iconButton
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <Button
            type="submit"
            className={`md:block ${form.getFieldState("name").isDirty ? "block" : "hidden"}`}
          >
            Add Item
          </Button>
        </div>
      </form>
    </Form>
  );
};
