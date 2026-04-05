import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import type { CreateShoppingListItemFormValues } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { useShoppingListSuggestions } from "@flatsby/api/hooks/useShoppingListSuggestions";
import { isCategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { createShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { Badge } from "~/lib/ui/badge";
import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";
import { trpc } from "~/utils/api";
import { CategoryPicker } from "./ShoppingListCategory";

interface ShoppingListItemAddFormProps {
  onSubmit: (values: CreateShoppingListItemFormValues) => void;
  groupId: number;
}

export const ShoppingListItemAddForm = ({
  onSubmit,
  groupId,
}: ShoppingListItemAddFormProps) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] =
    useState<CategoryIdWithAiAutoSelect>("ai-auto-select");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { suggestionItems, showSuggestions } = useShoppingListSuggestions(
    (input) => trpc.shoppingList.suggestItems.queryOptions(input),
    groupId,
    name,
  );

  const handleSubmit = () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const values = createShoppingListItemFormSchema.parse({
        name: name.trim(),
        categoryId,
      });
      onSubmit(values);
      setName("");
      setCategoryId("ai-auto-select");
    } catch (error) {
      console.error("Form validation error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionPress = (item: {
    name: string;
    categoryId: string;
  }) => {
    setName(item.name);
    setCategoryId(
      isCategoryIdWithAiAutoSelect(item.categoryId)
        ? item.categoryId
        : "ai-auto-select",
    );
  };

  return (
    <View className="bg-background gap-4 p-4">
      {showSuggestions && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
          keyboardShouldPersistTaps="always"
        >
          {suggestionItems.map((item) => (
            <Badge
              key={item.name}
              variant="outline"
              label={item.name}
              size="lg"
              onPress={() => handleSuggestionPress(item)}
            />
          ))}
        </ScrollView>
      )}
      <View className="flex-row items-center gap-3">
        <Input
          className="flex-1"
          placeholder="Add new item..."
          value={name}
          onChangeText={setName}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          submitBehavior="submit"
          editable={!isSubmitting}
          maxLength={
            createShoppingListItemFormSchema.shape.name.maxLength ?? undefined
          }
        />

        <CategoryPicker
          value={categoryId}
          onChange={setCategoryId}
          iconButton
        />
        {name.trim().length > 0 && (
          <Button
            title="Add"
            onPress={handleSubmit}
            disabled={isSubmitting}
            size="md"
          />
        )}
      </View>
    </View>
  );
};
