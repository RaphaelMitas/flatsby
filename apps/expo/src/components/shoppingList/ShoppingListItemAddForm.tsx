import React, { useState } from "react";
import { View } from "react-native";
import { z } from "zod/v4";

import type { CategoryIdWithAiAutoSelect } from "./ShoppingListCategory";
import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";
import { allCategories, CategoryPicker } from "./ShoppingListCategory";

const formSchema = z.object({
  name: z.string().min(1, "Item name is required").max(256, "Name is too long"),
  categoryId: z.enum(allCategories).default("ai-auto-select"),
});

interface ShoppingListItemAddFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
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
      const values = formSchema.parse({ name: name.trim(), categoryId });
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
