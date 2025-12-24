import type { EditShoppingListItemFormValues } from "@flatsby/validators/shopping-list";
import { useEffect, useState } from "react";

import { Button } from "@flatsby/ui/button";
import { Form, FormControl, FormField, useForm } from "@flatsby/ui/form";
import { editShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { CategorySelector } from "./CategorySelector";
import { ShoppingListItemInputFormField } from "./ShoppingListItemInputFormField";

interface ShoppingListItemEditFormProps {
  initialValues: EditShoppingListItemFormValues;
  onSubmit: (values: EditShoppingListItemFormValues) => void;
  onCancel: () => void;
}

export const ShoppingListItemEditForm = ({
  initialValues,
  onSubmit,
  onCancel,
}: ShoppingListItemEditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    schema: editShoppingListItemFormSchema,
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.setFocus("name");
  }, [form]);

  const handleSubmit = (values: EditShoppingListItemFormValues) => {
    setIsSubmitting(true);
    void onSubmit(values);
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form
        className="w-full py-4 pl-4"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <>
                    <ShoppingListItemInputFormField
                      field={field}
                      onCategoryDetected={(categoryId) => {
                        form.setValue("categoryId", categoryId);
                      }}
                    />
                  </>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormControl>
                  <CategorySelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              )}
            />
          </div>
          <div className="mt-auto flex gap-2">
            <Button
              className="md:group-hover:text-primary-foreground md:group-hover:hover:text-primary flex-1"
              variant="ghost"
              type="reset"
              disabled={isSubmitting}
              onClick={() => {
                form.reset();
                onCancel();
              }}
            >
              cancel
            </Button>
            <Button
              className="md:group-hover:bg-primary-foreground md:group-hover:text-primary flex-1"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
