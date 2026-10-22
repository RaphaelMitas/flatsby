import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import type { CreateShoppingListItemFormValues } from "@flatsby/validators/shopping-list";
import type { ComponentRef } from "react";
import type { TextInput } from "react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { useShoppingListSuggestions } from "@flatsby/api/hooks/useShoppingListSuggestions";
import { createShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { Badge } from "~/lib/ui/badge";
import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";
import { trpc } from "~/utils/api";
import { CategoryPicker, getCategoryData } from "./ShoppingListCategory";

interface ShoppingListItemAddFormProps {
  onSubmit: (values: CreateShoppingListItemFormValues) => void;
  groupId: number;
}

export const ShoppingListItemAddForm = ({
  onSubmit,
  groupId,
}: ShoppingListItemAddFormProps) => {
  const t = useTranslations("shoppingList.item");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] =
    useState<CategoryIdWithAiAutoSelect>("ai-auto-select");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();

  // The home's plus opens the list ready to type
  useEffect(() => {
    if (!focus) return;
    inputRef.current?.focus();
    router.setParams({ focus: undefined });
  }, [focus, router]);

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
    categoryId: CategoryId;
  }) => {
    setName(item.name);
    setCategoryId(item.categoryId);
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
              testID="shopping-list-suggestion"
              variant="outline"
              label={item.name}
              size="lg"
              icon={getCategoryData({ categoryId: item.categoryId }).icon}
              onPress={() => handleSuggestionPress(item)}
            />
          ))}
        </ScrollView>
      )}
      <View className="flex-row items-center gap-3">
        <Input
          ref={inputRef}
          testID="shopping-list-item-input"
          className="flex-1"
          placeholder={t("addPlaceholder")}
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
          testID="shopping-list-category-picker"
          value={categoryId}
          onChange={setCategoryId}
          iconButton
        />
        {name.trim().length > 0 && (
          <Button
            testID="shopping-list-add-item-button"
            title={t("add")}
            onPress={handleSubmit}
            disabled={isSubmitting}
            size="md"
          />
        )}
      </View>
    </View>
  );
};
