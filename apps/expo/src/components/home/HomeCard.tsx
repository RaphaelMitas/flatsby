import type { Pace } from "@flatsby/validators/home";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLocale, useTranslations } from "use-intl";

import { paceLabels, paceSummary } from "@flatsby/validators/home";

import Icon from "~/lib/ui/custom/icons/Icon";
import { Skeleton } from "~/lib/ui/skeleton";
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
  pace,
  today,
  format,
  unit,
  fadeIn,
}: {
  pace: Pace | undefined;
  today: string | undefined;
  format: (value: number) => string;
  unit?: (count: number) => string;
  fadeIn: boolean;
}) {
  const t = useTranslations("home.pace");
  const locale = useLocale();

  if (!pace || !today)
    return (
      <View className="mt-2">
        <View className="justify-center">
          <Text className="text-4xl font-extrabold opacity-0">0</Text>
          <Skeleton
            className="bg-foreground/10 absolute"
            size="xl"
            width="lg"
          />
        </View>
        <View className="justify-center">
          <Text className="text-sm opacity-0">0</Text>
          <Skeleton
            className="bg-foreground/10 absolute"
            size="xs"
            width="2xl"
          />
        </View>
      </View>
    );

  const { total, difference, direction } = paceSummary(pace);

  return (
    <Animated.View
      entering={fadeIn ? FadeIn.duration(300) : undefined}
      className="mt-2"
    >
      <View className="flex-row items-baseline gap-1">
        <Text className="text-foreground text-4xl font-extrabold tracking-tight">
          {format(total)}
        </Text>
        {unit && (
          <Text className="text-muted-foreground text-base font-medium">
            {unit(total)}
          </Text>
        )}
      </View>
      <Text className="text-muted-foreground text-sm">
        {t.rich(direction, {
          amount: format(Math.abs(difference)),
          month: paceLabels(today, locale).previousMonth,
          b: (chunks) => (
            <Text className="text-foreground font-semibold">{chunks}</Text>
          ),
        })}
      </Text>
    </Animated.View>
  );
}
