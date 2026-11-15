import type { TextInputProps } from "react-native";
import { Platform, Text, TextInput, View } from "react-native";

import { codeSlotGroups } from "@flatsby/validators/login";

interface CodeInputProps extends TextInputProps {
  value: string;
  length: number;
  groupSize: number;
  error?: boolean;
}

const CodeInput = ({
  value,
  length,
  groupSize,
  error,
  ...props
}: CodeInputProps) => {
  const groups = codeSlotGroups(length, groupSize);

  return (
    <View className="relative flex-row items-center justify-center gap-2">
      {groups.map((slots, group) => (
        <View key={slots[0]} className="flex-row items-center gap-2">
          {group > 0 && (
            <Text className="text-muted-foreground font-bold">–</Text>
          )}
          <View
            className={`flex-row overflow-hidden rounded-lg border ${
              error ? "border-destructive" : "border-border"
            }`}
          >
            {slots.map((index, i) => (
              <View
                key={index}
                className={`h-12 w-9 items-center justify-center ${
                  i > 0 ? "border-border border-l" : ""
                } ${index === value.length ? "bg-muted" : "bg-background"}`}
              >
                <Text
                  className={`font-mono text-xl font-bold ${
                    error ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {value[index]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <TextInput
        value={value}
        selection={{ start: value.length, end: value.length }}
        autoCorrect={false}
        caretHidden
        selectionColor="transparent"
        className="absolute inset-0 text-transparent"
        style={Platform.OS === "android" ? { color: "#00000001" } : undefined}
        {...props}
      />
    </View>
  );
};

export { CodeInput };
