import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { cn } from "~/lib/utils";
import { e2eAccessibilityOverride } from "~/utils/e2e";

const SNAP_POINTS = ["50%", "80%"];

interface SwitcherItem {
  id: number;
  title: string;
  subtitle: string;
  more?: { label: string; onPress: () => void };
}

interface SwitcherAction {
  testID: string;
  icon: IconProps["name"];
  title: string;
  onPress: () => void;
}

export function Switcher({
  barTestID,
  sheetTestID,
  icon,
  title,
  subtitle,
  sheetTitle,
  caption,
  items,
  selectedId,
  onSelect,
  actions,
  className,
}: {
  barTestID: string;
  sheetTestID: string;
  icon: IconProps["name"];
  title: string;
  subtitle: string;
  sheetTitle: string;
  caption?: string;
  items: SwitcherItem[];
  selectedId: number | null;
  onSelect: (item: SwitcherItem) => void;
  actions: SwitcherAction[];
  className?: string;
}) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const closeThen = (run: () => void) => () => {
    sheetRef.current?.dismiss();
    run();
  };

  return (
    <>
      <Pressable
        testID={barTestID}
        accessible={e2eAccessibilityOverride()}
        accessibilityRole="button"
        onPress={() => {
          setPicked(null);
          sheetRef.current?.present();
        }}
        className={cn(
          "border-border bg-card active:bg-muted flex-row items-center gap-3 rounded-2xl border p-2.5 shadow-sm",
          className,
        )}
      >
        <View className="bg-primary size-10 items-center justify-center rounded-xl">
          <Icon name={icon} size={20} color="primary-foreground" />
        </View>
        <View className="flex-1">
          <Text
            className="text-foreground text-base font-bold"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="text-muted-foreground text-xs">{subtitle}</Text>
        </View>
        <View className="bg-muted size-8 items-center justify-center rounded-full">
          <Icon name="chevrons-up-down" size={16} color="foreground" />
        </View>
      </Pressable>
      <SheetModal ref={sheetRef} snapPoints={SNAP_POINTS}>
        <ScrollView
          testID={sheetTestID}
          contentContainerClassName="gap-1 px-4 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center gap-2 px-1 pb-2">
            <Text className="text-foreground flex-1 text-xl font-extrabold">
              {sheetTitle}
            </Text>
            {caption && (
              <Text className="text-muted-foreground text-sm">{caption}</Text>
            )}
          </View>

          {items.map((item) => {
            const current = item.id === (picked ?? selectedId);
            return (
              <View key={item.id} className="flex-row items-center">
                <Pressable
                  testID={`${sheetTestID}-item-${item.id}`}
                  accessible={e2eAccessibilityOverride()}
                  onPress={() => {
                    setPicked(item.id);
                    // iOS animates the sheet out for a while; let the new check paint first
                    requestAnimationFrame(closeThen(() => onSelect(item)));
                  }}
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
                  {current && (
                    <Icon name="check" size={18} color="foreground" />
                  )}
                </Pressable>
                {item.more && (
                  <Pressable
                    testID={`${sheetTestID}-more-${item.id}`}
                    accessibilityLabel={item.more.label}
                    hitSlop={8}
                    onPress={closeThen(item.more.onPress)}
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
    </>
  );
}
