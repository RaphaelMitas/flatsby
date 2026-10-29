import type { TextInputProps } from "react-native";
import { Text, TextInput, View } from "react-native";

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
  const groups = Array.from({ length: length / groupSize }, (_, group) =>
    Array.from({ length: groupSize }, (_, i) => group * groupSize + i),
  );

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
        // A paste always appends, so the caller's last-digits rule finds it
        selection={{ start: value.length, end: value.length }}
        autoCorrect={false}
        caretHidden
        selectionColor="transparent"
        // iOS drops touches on opacity-0, so tap and long-press paste need transparent text
        className="absolute inset-0 text-transparent"
        {...props}
      />
    </View>
  );
};

export { CodeInput };
