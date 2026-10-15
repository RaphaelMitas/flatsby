import type { ControllerRenderProps } from "react-hook-form";
import { forwardRef } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("shoppingList.item");
  return (
    <FormItem className="relative flex-1">
      <FormControl>
        <Input
          {...field}
          data-testid="shopping-list-item-input"
          placeholder={t("inputPlaceholder")}
          maxLength={shoppingListItemNameSchema.maxLength ?? undefined}
          ref={ref}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
});

ShoppingListItemInputFormField.displayName = "ShoppingListInput";
