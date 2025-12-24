"use client";

import type { CreateShoppingListItemFormValues } from "@flatsby/validators/shopping-list";
import { useRef } from "react";

import { Button } from "@flatsby/ui/button";
import { Form, FormField, useForm } from "@flatsby/ui/form";
import { createShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { CategorySelector } from "./CategorySelector";
import { ShoppingListItemInputFormField } from "./ShoppingListItemInputFormField";

interface ShoppingListItemAddFormProps {
  onSubmit: (values: CreateShoppingListItemFormValues) => void;
}

export const ShoppingListItemAddForm = ({
  onSubmit,
}: ShoppingListItemAddFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useForm<
    CreateShoppingListItemFormValues,
    CreateShoppingListItemFormValues
  >({
    schema: createShoppingListItemFormSchema,
    defaultValues: {
      name: "",
      categoryId: "ai-auto-select",
    },
  });
  const handleSubmit = (values: CreateShoppingListItemFormValues) => {
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
