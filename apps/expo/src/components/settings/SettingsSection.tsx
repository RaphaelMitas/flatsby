import type React from "react";
import { Text, View } from "react-native";

import { cn } from "~/lib/utils";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection = ({
  title,
  children,
  className,
}: SettingsSectionProps) => {
  return (
    <View className={cn("mt-6", className)}>
      <Text className="text-muted-foreground px-4 py-2 text-sm font-medium tracking-wide uppercase">
        {title}
      </Text>
      <View className="bg-card">{children}</View>
    </View>
  );
};
