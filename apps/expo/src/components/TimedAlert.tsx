import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import Icon from "~/lib/ui/custom/icons/Icon";

interface TimedAlertProps {
  variant?:
    | "default"
    | "destructive"
    | "info"
    | "success"
    | "warning"
    | "error";
  title: string;
  description?: string;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
}

export const TimedAlert: React.FC<TimedAlertProps> = ({
  variant = "success",
  title,
  description,
  duration = 3000,
  onDismiss,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const getIcon = () => {
    switch (variant) {
      case "success":
        return "circle-check-big";
      case "destructive":
      case "error":
        return "circle-alert";
      case "warning":
        return "triangle-alert";
      case "info":
        return "info";
      default:
        return "circle-alert";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "success":
        return "text-success";
      case "destructive":
      case "error":
        return "text-destructive";
      case "warning":
        return "text-warning";
      case "info":
        return "text-info";
      default:
        return "text-foreground";
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      // Start fade out animation
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-20, { duration: 300 });

      // Handle dismiss after animation completes
      setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View style={animatedStyle}>
      <Alert variant={variant} className={className}>
        <View className="flex-row items-center gap-2">
          <Icon name={getIcon()} size={16} className={getIconColor()} />
          <AlertTitle variant={variant}>{title}</AlertTitle>
        </View>
        {description && (
          <AlertDescription variant={variant}>{description}</AlertDescription>
        )}
      </Alert>
    </Animated.View>
  );
};
