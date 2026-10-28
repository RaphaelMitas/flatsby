import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface TipCardProps {
  title: string;
  body: string;
  dismissLabel: string;
  onDismiss: () => void;
  testID?: string;
  dismissTestID?: string;
  className?: string;
  children?: ReactNode;
}

export function TipCard({
  title,
  body,
  dismissLabel,
  onDismiss,
  testID,
  dismissTestID,
  className,
  children,
}: TipCardProps) {
  return (
    <Card testID={testID} className={className}>
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start gap-2">
          <View className="flex-1 gap-1">
            <Text className="text-foreground text-base font-bold">{title}</Text>
            <Text className="text-muted-foreground text-sm">{body}</Text>
          </View>
          <Pressable
            testID={dismissTestID}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
            hitSlop={8}
            onPress={onDismiss}
          >
            <Icon name="x" size={18} color="muted-foreground" />
          </Pressable>
        </View>
        {children}
      </CardContent>
    </Card>
  );
}
