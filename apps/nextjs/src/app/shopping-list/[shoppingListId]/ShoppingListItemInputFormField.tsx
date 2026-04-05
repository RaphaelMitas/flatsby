import type { ControllerRenderProps } from "react-hook-form";
import { forwardRef } from "react";

import { FormControl, FormItem, FormMessage } from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { shoppingListItemNameSchema } from "@flatsby/validators/shopping-list";

type NameFieldProps = Pick<
  ControllerRenderProps<{ name: string }, "name">,
  "onChange" | "onBlur" | "value" | "name" | "ref"
>;

interface ShoppingListItemInputFormFieldProps {
  field: NameFieldProps;
}

export const ShoppingListItemInputFormField = forwardRef<
  HTMLInputElement,
  ShoppingListItemInputFormFieldProps
>(({ field }, ref) => {
  return (
    <FormItem className="relative flex-1">
      <FormControl>
        <Input
          {...field}
          placeholder="add new item"
          maxLength={shoppingListItemNameSchema.maxLength ?? undefined}
          ref={ref}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
});

ShoppingListItemInputFormField.displayName = "ShoppingListInput";
