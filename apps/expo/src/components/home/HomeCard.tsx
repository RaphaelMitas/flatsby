import type { Pace } from "@flatsby/validators/home";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLocale, useTranslations } from "use-intl";

import { isEmptyPace, paceLabels, paceSummary } from "@flatsby/validators/home";

import Icon from "~/lib/ui/custom/icons/Icon";
import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";

const cardFrame = "bg-card border-border rounded-3xl border p-4";

export const bold = (chunks: ReactNode) => (
  <Text className="text-foreground font-semibold">{chunks}</Text>
);

export function HomeCard({
  testID,
  title,
  onPress,
  accessory,
  className,
  children,
}: {
  testID?: string;
  title: string;
  onPress?: () => void;
  accessory?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const header = (
    <View className="flex-row items-center justify-between">
      <Text className="text-muted-foreground text-sm font-semibold">
        {title}
      </Text>
      {onPress ? (
        <Icon name="chevron-right" size={16} color="muted-foreground" />
      ) : (
        accessory
      )}
    </View>
  );

  if (!onPress)
    return (
      <View testID={testID} className={cn(cardFrame, className)}>
        {header}
        {children}
      </View>
    );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(cardFrame, "active:opacity-70", className)}
    >
      {header}
      {children}
    </Pressable>
  );
}

export function TextSkeleton({
  className,
  size,
  width,
}: {
  className: string;
  size: ComponentProps<typeof Skeleton>["size"];
  width: ComponentProps<typeof Skeleton>["width"];
}) {
  return (
    <View className="justify-center">
      <Text className={cn("opacity-0", className)}>0</Text>
      <Skeleton
        className="bg-foreground/10 absolute"
        size={size}
        width={width}
      />
    </View>
  );
}

export function HeadlineSkeleton() {
  return (
    <View className="mt-2">
      <TextSkeleton className="text-4xl font-extrabold" size="xl" width="lg" />
      <TextSkeleton className="text-sm" size="xs" width="2xl" />
    </View>
  );
}

export function Headline({
  value,
  format,
  unit,
}: {
  value: number;
  format: (value: number) => string;
  unit?: (count: number) => string;
}) {
  return (
    <View className="flex-row items-baseline gap-1">
      <Text className="text-foreground text-4xl font-extrabold tracking-tight">
        {format(value)}
      </Text>
      {unit && (
        <Text className="text-muted-foreground text-base font-medium">
          {unit(value)}
        </Text>
      )}
    </View>
  );
}

export function PaceComparison({
  pace,
  today,
  format,
  wholeMonth = false,
  className,
}: {
  pace: Pace;
  today: string;
  format: (value: number) => string;
  wholeMonth?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { difference, direction } = paceSummary(pace);

  return (
    <Text className={className}>
      {t.rich(
        wholeMonth
          ? `statistics.wholeMonth.${direction}`
          : `home.pace.${direction}`,
        {
          amount: format(Math.abs(difference)),
          month: paceLabels(today, locale).previousMonth,
          b: bold,
        },
      )}
    </Text>
  );
}

export function PaceHeadline({
  pace,
  today,
  format,
  unit,
  fadeIn,
  firstDay,
  children,
}: {
  pace: Pace | undefined;
  today: string | undefined;
  format: (value: number) => string;
  unit?: (count: number) => string;
  fadeIn: boolean;
  firstDay: "expenses" | "shopping" | "calendar";
  children?: ReactNode;
}) {
  const t = useTranslations();
  const empty = pace !== undefined && isEmptyPace(pace);

  return (
    <>
      {pace && today ? (
        <Animated.View
          entering={fadeIn ? FadeIn.duration(300) : undefined}
          className="mt-2"
        >
          {empty ? (
            <View className="gap-0.5">
              <Text className="text-foreground text-base font-semibold">
                {t(`home.firstDay.${firstDay}.title`)}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t(`home.firstDay.${firstDay}.body`)}
              </Text>
            </View>
          ) : (
            <>
              <Headline
                value={paceSummary(pace).total}
                format={format}
                unit={unit}
              />
              <PaceComparison
                pace={pace}
                today={today}
                format={format}
                className="text-muted-foreground text-sm"
              />
            </>
          )}
        </Animated.View>
      ) : (
        <HeadlineSkeleton />
      )}
      {!empty && children}
    </>
  );
}
