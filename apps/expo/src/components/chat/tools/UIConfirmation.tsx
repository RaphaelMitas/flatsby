import { Text, View } from "react-native";

import { Button } from "~/lib/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface UIConfirmationProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  hasResponded?: boolean;
  wasConfirmed?: boolean;
}

export function UIConfirmation({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  disabled = false,
  onConfirm,
  onCancel,
  hasResponded = false,
  wasConfirmed,
}: UIConfirmationProps) {
  // Show read-only state if already responded
  if (hasResponded && wasConfirmed !== undefined) {
    return (
      <Card className="my-2">
        <CardHeader className="pb-2">
          <View className="flex-row items-center gap-2">
            {destructive && (
              <Icon name="triangle-alert" size={16} color="warning" />
            )}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </View>
        </CardHeader>
        <CardContent className={title ? "pt-0" : ""}>
          <Text className="text-muted-foreground mb-2 text-sm">{message}</Text>
          <View className="flex-row items-center gap-2">
            {wasConfirmed ? (
              <>
                <Icon name="check" size={16} color="success" />
                <Text className="text-foreground text-sm">Confirmed</Text>
              </>
            ) : (
              <>
                <Icon name="x" size={16} color="destructive" />
                <Text className="text-foreground text-sm">Cancelled</Text>
              </>
            )}
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2">
      <CardHeader className="pb-2">
        <View className="flex-row items-center gap-2">
          {destructive && (
            <Icon name="triangle-alert" size={16} color="warning" />
          )}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </View>
      </CardHeader>
      <CardContent className={title ? "pt-0" : ""}>
        <Text className="text-muted-foreground mb-3 text-sm">{message}</Text>
        <View className="flex-row gap-2">
          <Button
            variant={destructive ? "destructive" : "primary"}
            size="sm"
            disabled={disabled}
            onPress={onConfirm}
            title={confirmLabel}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onPress={onCancel}
            title={cancelLabel}
          />
        </View>
      </CardContent>
    </Card>
  );
}
