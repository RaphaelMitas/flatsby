import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { RefObject } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { cn } from "~/lib/utils";
import { e2eAccessibilityOverride } from "~/utils/e2e";

const SNAP_POINTS = ["50%", "80%"];

export interface SwitcherItem {
  id: number;
  title: string;
  subtitle: string;
}

export interface SwitcherAction {
  testID: string;
  icon: IconProps["name"];
  title: string;
  onPress: () => void;
}

export function SwitcherSheet({
  sheetRef,
  testID,
  title,
  caption,
  icon,
  items,
  selectedId,
  onSelect,
  onMore,
  moreLabel,
  actions,
}: {
  sheetRef: RefObject<BottomSheetModal | null>;
  testID: string;
  title: string;
  caption?: string;
  icon: IconProps["name"];
  items: SwitcherItem[];
  selectedId: number | null;
  onSelect: (item: SwitcherItem) => void;
  onMore?: (item: SwitcherItem) => void;
  moreLabel?: (item: SwitcherItem) => string;
  actions: SwitcherAction[];
}) {
  const closeThen = (run: () => void) => () => {
    sheetRef.current?.dismiss();
    run();
  };

  return (
    <SheetModal ref={sheetRef} snapPoints={SNAP_POINTS}>
      <ScrollView
        testID={testID}
        contentContainerClassName="gap-1 px-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-baseline justify-between px-1 pb-2">
          <Text className="text-foreground text-xl font-extrabold">
            {title}
          </Text>
          {caption && (
            <Text className="text-muted-foreground text-sm">{caption}</Text>
          )}
        </View>

        {items.map((item) => {
          const current = item.id === selectedId;
          return (
            <View key={item.id} className="flex-row items-center">
              <Pressable
                testID={`${testID}-item-${item.id}`}
                accessible={e2eAccessibilityOverride()}
                onPress={closeThen(() => onSelect(item))}
                className="flex-1 flex-row items-center gap-3 p-2"
              >
                <View
                  className={cn(
                    "size-10 items-center justify-center rounded-xl",
                    current ? "bg-primary" : "bg-muted",
                  )}
                >
                  <Icon
                    name={icon}
                    size={18}
                    color={current ? "primary-foreground" : "foreground"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-foreground text-base font-semibold"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    {item.subtitle}
                  </Text>
                </View>
                {current && <Icon name="check" size={18} color="foreground" />}
              </Pressable>
              {onMore && (
                <Pressable
                  testID={`${testID}-more-${item.id}`}
                  accessibilityLabel={moreLabel?.(item)}
                  hitSlop={8}
                  onPress={closeThen(() => onMore(item))}
                  className="size-10 items-center justify-center"
                >
                  <Icon name="ellipsis" size={18} color="muted-foreground" />
                </Pressable>
              )}
            </View>
          );
        })}

        <View className="bg-border mx-1 my-2 h-px" />

        {actions.map((action) => (
          <Pressable
            key={action.testID}
            testID={action.testID}
            onPress={closeThen(action.onPress)}
            className="flex-row items-center gap-3 p-2"
          >
            <View className="border-muted-foreground size-10 items-center justify-center rounded-xl border border-dashed">
              <Icon name={action.icon} size={18} color="muted-foreground" />
            </View>
            <Text className="text-foreground text-base font-semibold">
              {action.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SheetModal>
  );
}
