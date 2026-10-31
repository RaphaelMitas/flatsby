import type { TextInputProps } from "react-native";
import { Platform, Text, TextInput, View } from "react-native";

import { codeSlotGroups } from "@flatsby/validators/login";

interface CodeInputProps extends TextInputProps {
  value: string;
  length: number;
  groupSize: number;
  error?: boolean;
}

// One invisible input over the slots, so paste and code autofill fill every slot at once
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
        // A paste always appends, so codeFromText finds it after the typed digits
        selection={{ start: value.length, end: value.length }}
        autoCorrect={false}
        caretHidden
        selectionColor="transparent"
        // iOS drops touches on opacity-0, so tap and long-press paste need transparent text
        className="absolute inset-0 text-transparent"
        // Android draws fully transparent text in the default color
        style={Platform.OS === "android" ? { color: "#00000001" } : undefined}
        {...props}
      />
    </View>
  );
};

export { CodeInput };
