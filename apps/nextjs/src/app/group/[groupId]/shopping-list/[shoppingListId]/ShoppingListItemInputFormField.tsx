import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/ui/categories";
import type { ControllerRenderProps } from "react-hook-form";
import { forwardRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@flatsby/ui/button";
import { FormControl, FormItem, FormMessage } from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";

import { useTRPC } from "~/trpc/react";

interface ShoppingListItemInputFormFieldProps {
  field: ControllerRenderProps<
    {
      name: string;
      categoryId?: CategoryIdWithAiAutoSelect;
    },
    "name"
  >;
  onCategoryDetected: (categoryId: CategoryId) => void;
}

export const ShoppingListItemInputFormField = forwardRef<
  HTMLInputElement,
  ShoppingListItemInputFormFieldProps
>(({ field, onCategoryDetected }, ref) => {
  const trpc = useTRPC();
  const categorizeItem = useMutation(
    trpc.shoppingList.categorizeItem.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          onCategoryDetected(data.data);
        } else {
          onCategoryDetected("other");
        }
      },
      onError: () => {
        onCategoryDetected("other");
      },
    }),
  );

  return (
    <FormItem className="relative flex-1">
      <FormControl>
        <Input
          {...field}
          placeholder="add new item"
          maxLength={256}
          ref={ref}
        />
      </FormControl>
      {field.value && (
        <Button
          type="button"
          variant="ghost"
          className="text-info hover:text-info absolute top-0 right-0 h-10 text-xs hover:bg-[unset] md:hover:underline"
          disabled={categorizeItem.isPending}
          onClick={() => categorizeItem.mutateAsync({ itemName: field.value })}
        >
          {categorizeItem.isPending ? "detecting..." : "detect category"}
        </Button>
      )}
      <FormMessage />
    </FormItem>
  );
});

ShoppingListItemInputFormField.displayName = "ShoppingListInput";
