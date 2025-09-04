import type { CategoryIdWithAiAutoSelect } from "@flatsby/ui/categories";
import { useEffect, useState } from "react";
import { z } from "zod/v4";

import { Button } from "@flatsby/ui/button";
import { categorysIdWithAiAutoSelect } from "@flatsby/ui/categories";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
  useForm,
} from "@flatsby/ui/form";

import { CategorySelector } from "./CategorySelector";
import { ShoppingListItemInputFormField } from "./ShoppingListItemInputFormField";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "name is required",
  }),
  categoryId: z.enum(categorysIdWithAiAutoSelect),
});

interface ShoppingListItemEditFormProps {
  initialValues: {
    name: string;
    categoryId?: CategoryIdWithAiAutoSelect;
  };
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
}

export const ShoppingListItemEditForm = ({
  initialValues,
  onSubmit,
  onCancel,
}: ShoppingListItemEditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    schema: formSchema,
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.setFocus("name");
  }, [form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
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
                    <FormMessage />
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
              className="flex-1 md:group-hover:text-primary-foreground md:group-hover:hover:text-primary"
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
              className="flex-1 md:group-hover:bg-primary-foreground md:group-hover:text-primary"
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
