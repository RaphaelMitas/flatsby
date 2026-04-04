import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import type { ControllerRenderProps } from "react-hook-form";
import { forwardRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { useShoppingListSuggestions } from "@flatsby/api/hooks/useShoppingListSuggestions";
import {
  Suggestion,
  Suggestions,
} from "@flatsby/ui/ai-elements/suggestion";
import { Button } from "@flatsby/ui/button";
import { FormControl, FormItem, FormMessage } from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { isCategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { shoppingListItemNameSchema } from "@flatsby/validators/shopping-list";

import { useTRPC } from "~/trpc/react";

type NameFieldProps = Pick<
  ControllerRenderProps<{ name: string }, "name">,
  "onChange" | "onBlur" | "value" | "name" | "ref"
>;

interface ShoppingListItemInputFormFieldProps {
  field: NameFieldProps;
  groupId?: number;
  onCategoryDetected: (categoryId: CategoryId) => void;
  onSuggestionSelected?: (
    name: string,
    categoryId: CategoryIdWithAiAutoSelect,
  ) => void;
}

export const ShoppingListItemInputFormField = forwardRef<
  HTMLInputElement,
  ShoppingListItemInputFormFieldProps
>(({ field, groupId, onCategoryDetected, onSuggestionSelected }, ref) => {
  const trpc = useTRPC();

  const { suggestionItems, showSuggestions } = useShoppingListSuggestions(
    (input) => trpc.shoppingList.suggestItems.queryOptions(input),
    groupId,
    field.value,
  );

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
          maxLength={shoppingListItemNameSchema.maxLength ?? undefined}
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
      {showSuggestions && (
        <Suggestions className="pt-1">
          {suggestionItems.map((item) => (
            <Suggestion
              key={item.name}
              suggestion={item.name}
              onClick={(name) => {
                const categoryId = isCategoryIdWithAiAutoSelect(
                  item.categoryId,
                )
                  ? item.categoryId
                  : "ai-auto-select";
                onSuggestionSelected?.(name, categoryId);
              }}
            />
          ))}
        </Suggestions>
      )}
      <FormMessage />
    </FormItem>
  );
});

ShoppingListItemInputFormField.displayName = "ShoppingListInput";
