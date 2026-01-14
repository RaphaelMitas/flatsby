import type { ShoppingListInfo } from "@flatsby/validators/chat/tools";
import { useCallback } from "react";
import { Text } from "react-native";

import { Button } from "~/lib/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface ShoppingListSelectorProps {
  lists: ShoppingListInfo[];
  onSelect: (list: ShoppingListInfo) => void;
  disabled?: boolean;
}

export function ShoppingListSelector({
  lists,
  onSelect,
  disabled,
}: ShoppingListSelectorProps) {
  const handleSelect = useCallback(
    (list: ShoppingListInfo) => {
      if (!disabled) {
        onSelect(list);
      }
    },
    [disabled, onSelect],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex-row items-center gap-2">
          <Icon name="list" size={16} color="foreground" />
          <Text className="text-foreground text-sm font-medium">
            Select a list
          </Text>
        </CardTitle>
      </CardHeader>
      <CardContent className="gap-2 pt-0">
        {lists.map((list) => (
          <Button
            key={list.id}
            variant="outline"
            onPress={() => handleSelect(list)}
            disabled={disabled}
            title={`${list.name} (${list.uncheckedItemLength})`}
            className="justify-start"
          />
        ))}
      </CardContent>
    </Card>
  );
}
