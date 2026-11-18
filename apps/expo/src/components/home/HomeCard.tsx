import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";

export function HomeCard({
  testID,
  title,
  onPress,
  className,
  children,
}: {
  testID: string;
  title: string;
  onPress: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "bg-card border-border rounded-3xl border p-4 active:opacity-70",
        className,
      )}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-muted-foreground text-sm font-semibold">
          {title}
        </Text>
        <Icon name="chevron-right" size={16} color="muted-foreground" />
      </View>
      {children}
    </Pressable>
  );
}

export function PaceHeadline({
  value,
  unit,
  difference,
  amount,
  month,
}: {
  value: string;
  unit?: string;
  difference: number;
  amount: string;
  month: string;
}) {
  const t = useTranslations("home.pace");
  const direction = difference < 0 ? "less" : difference > 0 ? "more" : "same";

  return (
    <>
      <View className="mt-2 flex-row items-baseline gap-1">
        <Text className="text-foreground text-4xl font-extrabold tracking-tight">
          {value}
        </Text>
        {unit && (
          <Text className="text-muted-foreground text-base font-medium">
            {unit}
          </Text>
        )}
      </View>
      <Text className="text-muted-foreground text-sm">
        {t.rich(direction, {
          amount,
          month,
          b: (chunks) => (
            <Text className="text-foreground font-semibold">{chunks}</Text>
          ),
        })}
      </Text>
    </>
  );
}
