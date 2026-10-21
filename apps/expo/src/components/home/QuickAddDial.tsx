import type { ShoppingListSummary } from "@flatsby/api";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useIsFocused, useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";

export function QuickAddDial({
  groupId,
  last,
  lastUsed,
  others,
  onOpenList,
}: {
  groupId: number;
  last: ShoppingListSummary | undefined;
  /** False right after a group switch, when the list is just the first one */
  lastUsed: boolean;
  others: ShoppingListSummary[];
  onOpenList: (list: ShoppingListSummary) => void;
}) {
  const t = useTranslations("home.new.dial");
  const router = useRouter();
  const isFocused = useIsFocused();
  const [open, setOpen] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const progress = useSharedValue(0);
  const size = useSharedValue({ width: 0, height: 0 });

  useEffect(() => {
    if (!isFocused) setOpen(false);
  }, [isFocused]);

  useEffect(() => {
    progress.value = open
      ? withSpring(1, { damping: 16, stiffness: 220 })
      : withTiming(0, { duration: 160 });
    if (!open) setShowOthers(false);
  }, [open, progress]);

  // Grows out of the plus in the bottom right corner
  const cardStyle = useAnimatedStyle(() => {
    const scale = 0.2 + progress.value * 0.8;
    return {
      opacity: Math.min(progress.value * 3, 1),
      transform: [
        { translateX: ((1 - scale) * size.value.width) / 2 },
        { translateY: ((1 - scale) * size.value.height) / 2 },
        { scale },
      ],
    };
  });
  // bg-black/30 renders nothing here: the theme has no black
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  }));
  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 135}deg` }],
  }));

  const go = (action: () => void) => {
    setOpen(false);
    action();
  };
  const openList = (list: ShoppingListSummary) => go(() => onOpenList(list));

  return (
    <>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        style={scrimStyle}
        className="absolute inset-0"
      >
        <Pressable
          testID="home-dial-scrim"
          className="flex-1"
          onPress={() => setOpen(false)}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        onLayout={({ nativeEvent: { layout } }) => {
          size.value = { width: layout.width, height: layout.height };
        }}
        layout={LinearTransition}
        style={cardStyle}
        className="bg-card border-border absolute right-4 bottom-24 w-64 rounded-3xl border p-2.5 shadow-xl"
      >
        <View className="flex-row gap-2">
          <Tile
            testID="home-dial-expense"
            icon="receipt"
            label={t("expense")}
            onPress={() =>
              go(() =>
                router.push(
                  {
                    pathname: "/(tabs)/expenses/create",
                    params: { focus: "1" },
                  },
                  { withAnchor: true },
                ),
              )
            }
          />
          <Tile
            testID="home-dial-calendar"
            icon="calendar-plus"
            label={t("calendarEntry")}
            onPress={() =>
              go(() =>
                router.push("/(tabs)/calendar/form", { withAnchor: true }),
              )
            }
          />
        </View>

        {others.length > 0 && (
          <Pressable
            testID="home-dial-other-lists"
            onPress={() => setShowOthers((shown) => !shown)}
            className="mt-1 flex-row items-center gap-2.5 px-2 pt-2.5 pb-2"
          >
            <Icon name="list" size={19} color="foreground" />
            <Text className="text-foreground flex-1 font-medium">
              {t("otherLists")}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {others.length}
            </Text>
            <Icon
              name={showOthers ? "chevron-up" : "chevron-down"}
              size={16}
              color="muted-foreground"
            />
          </Pressable>
        )}
        {showOthers && (
          <ScrollView className="max-h-48">
            {others.map((list) => (
              <Animated.View
                key={list.id}
                entering={FadeIn}
                exiting={FadeOut.duration(100)}
              >
                <Pressable
                  onPress={() => openList(list)}
                  className="active:bg-muted flex-row items-center gap-2 rounded-xl py-2 pr-2 pl-9"
                >
                  <Text numberOfLines={1} className="text-foreground flex-1">
                    {list.name}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    {t("open", { count: list.uncheckedItemLength })}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        )}

        {last ? (
          <Pressable
            testID="home-dial-last-list"
            onPress={() => openList(last)}
            className="bg-primary mt-2 flex-row items-center gap-3 rounded-2xl p-3 active:opacity-90"
          >
            <Icon name="shopping-basket" size={20} color="primary-foreground" />
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="text-primary-foreground text-base font-bold"
              >
                {last.name}
              </Text>
              <Text className="text-primary-foreground text-xs opacity-70">
                {t(lastUsed ? "lastUsed" : "open", {
                  count: last.uncheckedItemLength,
                })}
              </Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            testID="home-dial-new-list"
            onPress={() =>
              go(() =>
                router.push({
                  pathname: "/(tabs)/home/shopping-lists/create",
                  params: { groupId: String(groupId) },
                }),
              )
            }
            className="border-border mt-2 flex-row items-center gap-3 rounded-2xl border border-dashed p-3"
          >
            <Icon name="list-plus" size={20} color="foreground" />
            <View>
              <Text className="text-foreground text-base font-bold">
                {t("newList")}
              </Text>
              <Text className="text-muted-foreground text-xs">
                {t("noLists")}
              </Text>
            </View>
          </Pressable>
        )}
      </Animated.View>

      <Pressable
        testID="home-dial"
        accessibilityLabel={t("add")}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((isOpen) => !isOpen)}
        className="bg-primary absolute right-4 bottom-4 h-14 w-14 items-center justify-center rounded-2xl shadow-lg active:opacity-90"
      >
        <Animated.View style={plusStyle}>
          <Icon name="plus" size={26} color="primary-foreground" />
        </Animated.View>
      </Pressable>
    </>
  );
}

function Tile({
  icon,
  label,
  testID,
  onPress,
}: {
  icon: IconProps["name"];
  label: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="bg-muted flex-1 gap-2 rounded-2xl p-3 active:opacity-80"
    >
      <Icon name={icon} size={22} color="foreground" />
      <Text className="text-foreground text-sm font-semibold">{label}</Text>
    </Pressable>
  );
}
