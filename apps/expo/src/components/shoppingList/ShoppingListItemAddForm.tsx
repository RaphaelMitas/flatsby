import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import type { CreateShoppingListItemFormValues } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import { View } from "react-native";

import { createShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";
import { CategoryPicker } from "./ShoppingListCategory";

interface ShoppingListItemAddFormProps {
  onSubmit: (values: CreateShoppingListItemFormValues) => void;
}

export const ShoppingListItemAddForm = ({
  onSubmit,
}: ShoppingListItemAddFormProps) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] =
    useState<CategoryIdWithAiAutoSelect>("ai-auto-select");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <View className="flex-row items-center gap-3 p-4">
      <Input
        className="flex-1"
        placeholder="Add new item..."
        value={name}
        onChangeText={setName}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        submitBehavior="submit"
        editable={!isSubmitting}
      />

      <CategoryPicker value={categoryId} onChange={setCategoryId} iconButton />
      {name.trim().length > 0 && (
        <Button
          title="Add"
          onPress={handleSubmit}
          disabled={isSubmitting}
          size="md"
        />
      )}
    </View>
  );
};
