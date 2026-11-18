import type { Pace } from "@flatsby/validators/home";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { paceLabels, paceSummary } from "@flatsby/validators/home";

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
  pace,
  today,
  format,
  unit,
}: {
  pace: Pace;
  today: string;
  format: (value: number) => string;
  unit?: (count: number) => string;
}) {
  const t = useTranslations("home.pace");
  const locale = useLocale();
  const { total, difference, direction } = paceSummary(pace);

  return (
    <>
      <View className="mt-2 flex-row items-baseline gap-1">
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
    </>
  );
}
