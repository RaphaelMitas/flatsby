import type React from "react";
import { Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";

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
  const t = useTranslations("settings.profile");
  return (
    <Card>
      <CardHeader>
        <View className="items-center">
          <Avatar>
            <AvatarImage alt={t("avatarAlt", { name })} />
            <AvatarFallback className="text-muted-foreground text-xl">
              {fallbackText}
            </AvatarFallback>
          </Avatar>
          <CardTitle>{name}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </View>
      </CardHeader>
      <CardContent>
        {showChangePhoto && (
          <>
            <Button
              disabled={disabled}
              variant="outline"
              icon="upload"
              title={t("changePhoto")}
              className="w-full"
              onPress={onChangePhoto}
            />
            <Text className="text-muted-foreground mt-2 text-xs">
              {t("photoComingSoon")}
            </Text>
          </>
        )}
      </CardContent>
    </Card>
  );
};
