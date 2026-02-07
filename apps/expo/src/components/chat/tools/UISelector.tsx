import type { SelectorOption } from "@flatsby/validators/chat/tools";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "~/lib/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface UISelectorProps {
  title?: string;
  options: SelectorOption[];
  multiSelect?: boolean;
  disabled?: boolean;
  onSelect: (selectedIds: string[]) => void;
  hasResponded?: boolean;
  previousResponse?: string[];
}

export function UISelector({
  title,
  options,
  multiSelect = false,
  disabled = false,
  onSelect,
  hasResponded = false,
  previousResponse,
}: UISelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(previousResponse ?? []),
  );

  const handleSelect = (id: string) => {
    if (hasResponded || disabled) return;

    if (multiSelect) {
      const newSelected = new Set(selected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelected(newSelected);
    } else {
      // Single select - immediately submit
      onSelect([id]);
    }
  };

  const handleSubmitMulti = () => {
    if (selected.size > 0) {
      onSelect(Array.from(selected));
    }
  };

  // Show read-only state if already responded
  if (hasResponded && previousResponse) {
    const selectedLabels = previousResponse
      .map((id) => options.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    return (
      <Card className="my-2">
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={title ? "pt-0" : ""}>
          <View className="flex-row items-center gap-2">
            <Icon name="check" size={16} color="success" />
            <Text className="text-muted-foreground text-sm">
              Selected: {selectedLabels}
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>
        <View className="flex-row flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.id}
              variant={selected.has(option.id) ? "primary" : "outline"}
              size="sm"
              disabled={disabled}
              onPress={() => handleSelect(option.id)}
              icon={selected.has(option.id) ? "check" : undefined}
              title={option.label}
            />
          ))}
        </View>
        {selected.size > 0 &&
          options.find((o) => selected.has(o.id))?.description && (
            <Text className="text-muted-foreground mt-1 text-xs">
              {options.find((o) => selected.has(o.id))?.description}
            </Text>
          )}
        {multiSelect && selected.size > 0 && (
          <Button
            size="sm"
            className="mt-2"
            disabled={disabled}
            onPress={handleSubmitMulti}
            title="Confirm selection"
          />
        )}
      </CardContent>
    </Card>
  );
}
