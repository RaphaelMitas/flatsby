"use client";

import { useRef } from "react";
import { z } from "zod/v4";

import { Button } from "@flatsby/ui/button";
import { categorysIdWithAiAutoSelect } from "@flatsby/ui/categories";
import { Form, FormField, useForm } from "@flatsby/ui/form";

import { CategorySelector } from "./CategorySelector";
import { ShoppingListItemInputFormField } from "./ShoppingListItemInputFormField";

const formSchema = z.object({
  name: z.string().max(256, {
    message: "name is too long",
  }),
  categoryId: z.enum(categorysIdWithAiAutoSelect).default("ai-auto-select"),
});

interface ShoppingListItemAddFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
}

export const ShoppingListItemAddForm = ({
  onSubmit,
}: ShoppingListItemAddFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useForm({
    schema: formSchema,
    defaultValues: {
      name: "",
      categoryId: "ai-auto-select",
    },
  });
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
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
        onSubmit={form.handleSubmit(handleSubmit)}
        className="sticky bottom-0 bg-background p-4"
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
