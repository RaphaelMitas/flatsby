import { View } from "react-native";

import { cn } from "~/lib/utils";

export function SplitBar({
  segments,
}: {
  segments: { key: string; value: number; fill: string }[];
}) {
  return (
    <View className="mt-4 h-3 flex-row gap-0.5 overflow-hidden rounded-md">
      {segments
        .filter(({ value }) => value > 0)
        .map(({ key, value, fill }) => (
          <View
            key={key}
            className={cn("rounded-sm", fill)}
            style={{ flex: value }}
          />
        ))}
    </View>
  );
}
