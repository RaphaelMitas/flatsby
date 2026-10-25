import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocale } from "use-intl";

import { useThemeColors } from "../utils";
import { Label } from "./label";

interface DatePickerFieldProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: "date" | "time";
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
  accessibilityLabel?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  mode = "date",
  minimumDate,
  maximumDate,
  testID,
  accessibilityLabel,
}: DatePickerFieldProps) {
  const locale = useLocale();
  const [showPicker, setShowPicker] = useState(false);
  const { colorScheme } = useThemeColors();
  const formatted =
    mode === "date"
      ? value.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : value.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        });

  if (Platform.OS === "ios") {
    return (
      <View className="gap-2">
        {!!label && <Label>{label}</Label>}
        <DateTimePicker
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          value={value}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          display="default"
          themeVariant={colorScheme}
          className="border-input bg-background h-12 rounded-lg border px-3"
          onValueChange={(_, selectedDate) => onChange(selectedDate)}
        />
      </View>
    );
  }

  return (
    <View className="gap-2">
      {!!label && <Label>{label}</Label>}
      <Pressable
        testID={testID}
        // A label on a Pressable replaces its text, so the value has to be part of it
        accessibilityLabel={
          accessibilityLabel && `${accessibilityLabel}, ${formatted}`
        }
        onPress={() => setShowPicker(true)}
        className="border-input bg-background flex h-12 flex-row items-center rounded-lg border px-3"
      >
        <Text className="text-foreground">{formatted}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          display="default"
          onValueChange={(_, selectedDate) => {
            setShowPicker(false);
            onChange(selectedDate);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}
    </View>
  );
}
