import { Pressable, Text, View } from "react-native";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { e2eAccessibilityOverride } from "~/utils/e2e";

export function SwitcherBar({
  testID,
  icon,
  title,
  subtitle,
  onPress,
  className,
}: {
  testID: string;
  icon: IconProps["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessible={e2eAccessibilityOverride()}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "border-border bg-card active:bg-muted flex-row items-center gap-3 rounded-2xl border p-2.5 shadow-sm",
        className,
      )}
    >
      <View className="bg-primary size-10 items-center justify-center rounded-xl">
        <Icon name={icon} size={20} color="primary-foreground" />
      </View>
      <View className="flex-1">
        <Text className="text-foreground text-base font-bold" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-muted-foreground text-xs">{subtitle}</Text>
      </View>
      <View className="bg-muted size-8 items-center justify-center rounded-full">
        <Icon name="chevrons-up-down" size={16} color="foreground" />
      </View>
    </Pressable>
  );
}
