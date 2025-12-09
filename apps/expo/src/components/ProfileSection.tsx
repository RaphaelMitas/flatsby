import type React from "react";
import { Text, View } from "react-native";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";

interface ProfileSectionProps {
  name: string;
  subtitle?: string;
  fallbackText: string;
  onChangePhoto?: () => void;
  showChangePhoto?: boolean;
  disabled?: boolean;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  name,
  subtitle,
  fallbackText,
  onChangePhoto,
  showChangePhoto = true,
  disabled = true,
}) => {
  return (
    <View className="items-center rounded-lg p-6">
      <Avatar>
        <AvatarImage alt={`${name} Avatar`} />
        <AvatarFallback className="text-muted-foreground text-xl">
          {fallbackText}
        </AvatarFallback>
      </Avatar>
      <Text className="text-foreground mb-2 text-lg font-semibold">{name}</Text>
      {subtitle && (
        <Text className="text-muted-foreground mb-4 text-sm">{subtitle}</Text>
      )}
      {showChangePhoto && (
        <>
          <Button
            disabled={disabled}
            variant="outline"
            icon="upload"
            title="Change Photo"
            className="w-full"
            onPress={onChangePhoto}
          />
          <Text className="text-muted-foreground mt-2 text-xs">
            Photo upload coming soon!
          </Text>
        </>
      )}
    </View>
  );
};
