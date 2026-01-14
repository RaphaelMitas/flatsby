import { Pressable, Text, View } from "react-native";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  iconName: IconProps["name"];
  onPress?: () => void;
  variant?: "default" | "destructive";
  rightContent?: React.ReactNode;
}

export const SettingsItem = ({
  title,
  subtitle,
  iconName,
  onPress,
  variant = "default",
  rightContent,
}: SettingsItemProps) => {
  const isDestructive = variant === "destructive";

  return (
    <Pressable
      onPress={onPress}
      className={`border-border bg-card active:bg-muted flex-row items-center justify-between border-b px-4 py-3 ${
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
            <Text className="text-muted-foreground text-sm">{subtitle}</Text>
          )}
        </View>
      </View>
      {!rightContent ? (
        <Icon
          name="chevron-right"
          size={16}
          className="text-muted-foreground"
        />
      ) : (
        <>{rightContent}</>
      )}
    </Pressable>
  );
};
