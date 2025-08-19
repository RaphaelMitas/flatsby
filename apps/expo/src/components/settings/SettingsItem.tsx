import React from "react";
import { Pressable, Text, View } from "react-native";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  iconName: IconProps["name"];
  onPress: () => void;
  variant?: "default" | "destructive";
}

export const SettingsItem = ({
  title,
  subtitle,
  iconName,
  onPress,
  variant = "default",
}: SettingsItemProps) => {
  const isDestructive = variant === "destructive";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between border-b border-border bg-card px-4 py-3 active:bg-muted ${
        isDestructive ? "bg-destructive/10" : ""
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${
            isDestructive ? "bg-destructive/20" : "bg-primary/10"
          }`}
        >
          <Icon
            name={iconName}
            size={16}
            color={isDestructive ? "destructive" : "primary"}
          />
        </View>
        <View>
          <Text
            className={`text-base font-medium ${
              isDestructive ? "text-destructive" : "text-foreground"
            }`}
          >
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sm text-muted-foreground">{subtitle}</Text>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={16} className="text-muted-foreground" />
    </Pressable>
  );
};
