import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";

export function ExpenseFormRow({
  icon,
  title,
  value,
  trailing,
  children,
}: {
  icon: IconProps["name"];
  title: string;
  value?: string;
  trailing?: IconProps["name"];
  children?: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className="bg-muted h-8 w-8 items-center justify-center rounded-full">
        <Icon name={icon} size={16} color="foreground" />
      </View>
      <Text className="text-foreground flex-1 text-base font-medium">
        {title}
      </Text>
      {children}
      {value !== undefined && (
        <Text numberOfLines={1} className="text-muted-foreground shrink">
          {value}
        </Text>
      )}
      {trailing && <Icon name={trailing} size={16} color="muted-foreground" />}
    </View>
  );
}
