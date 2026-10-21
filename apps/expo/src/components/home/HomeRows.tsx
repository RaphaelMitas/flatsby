import type { CalendarColor } from "@flatsby/validators/calendar";
import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocale } from "use-intl";

import { formatCalendarDate } from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";

export function HomeRows({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View testID="home-rows" className="mt-6">
      <Text className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        {title}
      </Text>
      {children}
    </View>
  );
}

export interface HomeRowProps {
  testID: string;
  lead: ReactNode;
  label: string;
  value?: string;
  muted?: boolean;
  first?: boolean;
  onPress: () => void;
}

export function HomeRow({
  lead,
  label,
  value,
  muted = false,
  first = false,
  testID,
  onPress,
}: HomeRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "active:bg-muted h-12 flex-row items-center gap-3",
        !first && "border-border border-t",
      )}
    >
      <View className="h-8 w-8 items-center justify-center">{lead}</View>
      <Text
        numberOfLines={1}
        className={cn(
          "min-w-0 flex-1 text-sm",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {label}
      </Text>
      {value && (
        <Text
          numberOfLines={1}
          className="text-muted-foreground shrink text-sm"
        >
          {value}
        </Text>
      )}
      <Icon name="chevron-right" size={15} color="muted-foreground" />
    </Pressable>
  );
}

export function PersonLead({ person }: { person: DebtPerson }) {
  return (
    <MemberAvatar person={person} className="h-8 w-8" textClassName="text-sm" />
  );
}

export function DoneLead() {
  return (
    <View className="bg-muted h-8 w-8 items-center justify-center rounded-full">
      <Icon name="check" size={15} color="muted-foreground" />
    </View>
  );
}

export function IconLead({ name }: { name: IconProps["name"] }) {
  return (
    <View className="bg-muted h-8 w-8 items-center justify-center rounded-full">
      <Icon name={name} size={16} color="foreground" />
    </View>
  );
}

export function DateLead({
  date,
  color,
}: {
  date: string;
  color: CalendarColor;
}) {
  const locale = useLocale();
  const day = formatCalendarDate(date, locale, { day: "numeric" });

  return (
    <View className="border-border bg-card h-8 w-8 overflow-hidden rounded-md border">
      <View className={cn("h-2 w-full", categoryFillColorMap[color])} />
      <Text className="text-foreground text-center text-xs font-bold">
        {day}
      </Text>
    </View>
  );
}

export function CountLead({ count }: { count: number }) {
  return (
    <View className="bg-muted h-8 w-8 items-center justify-center rounded-full">
      <Icon name="shopping-basket" size={16} color="foreground" />
      <View className="bg-primary absolute -top-1 -right-1 h-5 min-w-5 items-center justify-center rounded-full px-1">
        <Text className="text-primary-foreground text-xs font-bold">
          {count}
        </Text>
      </View>
    </View>
  );
}
