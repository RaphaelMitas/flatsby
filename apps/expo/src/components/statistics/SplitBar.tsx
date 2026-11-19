import { Pressable, View } from "react-native";

import { cn } from "~/lib/utils";

export function SplitBar({
  segments,
  lit = null,
  disabled,
  onPick,
}: {
  segments: { key: string; value: number; fill: string; label: string }[];
  lit?: string | null;
  disabled?: boolean;
  onPick: (key: string) => void;
}) {
  const shown = segments.filter(({ value }) => value > 0);

  return (
    <View className="mt-1 -mb-3 flex-row gap-0.5">
      {shown.map(({ key, value, fill, label }, index) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: lit === key }}
          disabled={disabled}
          onPress={() => onPick(key)}
          className="py-3"
          style={{ flex: value }}
        >
          <View
            className={cn(
              "h-3",
              index === 0 && "rounded-l-md",
              index === shown.length - 1 && "rounded-r-md",
              fill,
              lit !== null && lit !== key && "opacity-30",
            )}
          />
        </Pressable>
      ))}
    </View>
  );
}
