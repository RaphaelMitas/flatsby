import React from "react";
import { Text, View } from "react-native";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";

interface SettingsHeaderProps {
  title: string;
  avatar?: string;
}

export const SettingsHeader = ({ title, avatar }: SettingsHeaderProps) => {
  return (
    <View className="items-center bg-card px-4 py-6">
      <Avatar className="mb-3 h-16 w-16">
        <AvatarImage src={avatar} alt="User Avatar" />
        <AvatarFallback>{title.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
    </View>
  );
};
