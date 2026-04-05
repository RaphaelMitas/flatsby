"use client";

import type { CreateShoppingListItemFormValues } from "@flatsby/validators/shopping-list";
import { useRef } from "react";
import { useWatch } from "react-hook-form";

import { useShoppingListSuggestions } from "@flatsby/api/hooks/useShoppingListSuggestions";
import { cn } from "@flatsby/ui";
import { Suggestion, Suggestions } from "@flatsby/ui/ai-elements/suggestion";
import { Button } from "@flatsby/ui/button";
import { getCategoryData } from "@flatsby/ui/categories";
import { Form, FormField, useForm } from "@flatsby/ui/form";
import { createShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { useTRPC } from "~/trpc/react";
import { CategorySelector } from "./CategorySelector";
import { ShoppingListItemInputFormField } from "./ShoppingListItemInputFormField";

interface ShoppingListItemAddFormProps {
  onSubmit: (values: CreateShoppingListItemFormValues) => void;
  groupId: number;
}

export const ShoppingListItemAddForm = ({
  onSubmit,
  groupId,
}: ShoppingListItemAddFormProps) => {
  const trpc = useTRPC();
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

  const nameValue = useWatch({ control: form.control, name: "name" });
  const { suggestionItems, showSuggestions } = useShoppingListSuggestions(
    (input) => trpc.shoppingList.suggestItems.queryOptions(input),
    groupId,
    nameValue,
  );

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => form.handleSubmit(handleSubmit)(e)}
        className="bg-background sticky bottom-0 flex flex-col gap-2 px-4 py-2"
      >
        {showSuggestions && (
          <Suggestions>
            {suggestionItems.map((item) => {
              const category = getCategoryData(item.categoryId);
              return (
                <Suggestion
                  key={item.name}
                  suggestion={item.name}
                  onClick={(name) => {
                    form.setValue("name", name, { shouldDirty: true });
                    form.setValue("categoryId", item.categoryId);
                    inputRef.current?.focus();
                  }}
                >
                  <category.icon
                    className={cn("size-3", category.colorClasses.base)}
                  />
                  {item.name}
                </Suggestion>
              );
            })}
          </Suggestions>
        )}
        <div className="flex flex-row gap-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <ShoppingListItemInputFormField ref={inputRef} field={field} />
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
      </form>
    </Form>
  );
};
