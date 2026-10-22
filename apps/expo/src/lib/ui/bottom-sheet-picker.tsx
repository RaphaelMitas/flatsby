import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { ReactNode } from "react";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";

import { SheetModal } from "./sheet-modal";

const SNAP_POINTS = ["50%", "80%"];

const itemVariants = tv({
  base: "flex-row items-center gap-3 px-4 py-3 active:bg-muted/50",
  variants: {
    selected: {
      true: "bg-muted",
    },
  },
});

const itemTextVariants = tv({
  base: "flex-1",
});

const itemTitleVariants = tv({
  base: "text-base font-medium text-foreground",
});

const itemDescriptionVariants = tv({
  base: "text-sm text-muted-foreground",
});

const triggerVariants = tv({
  base: "flex-row gap-2 items-center rounded-lg border border-input h-12 justify-center px-4 py-2",
  variants: {
    iconButton: {
      true: "justify-center h-12 w-12 p-0",
    },
    disabled: {
      true: "opacity-50",
    },
  },
});

const triggerTextVariants = tv({
  base: "text-foreground",
});

const bottomSheetContentVariants = tv({
  base: "flex-1 gap-2 pb-8",
});

export interface BottomSheetPickerItem {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface PickerConfig {
  items: BottomSheetPickerItem[];
  selectedId?: string;
  onSelect?: (item: BottomSheetPickerItem) => void;
}

interface BottomSheetPickerContextValue {
  openPicker: (config: PickerConfig) => void;
}

const BottomSheetPickerContext =
  createContext<BottomSheetPickerContextValue | null>(null);

export const useBottomSheetPicker = () => {
  const context = useContext(BottomSheetPickerContext);
  if (!context) {
    throw new Error(
      "useBottomSheetPicker must be used within a BottomSheetPickerProvider",
    );
  }
  return context;
};

interface BottomSheetPickerProviderProps {
  children: ReactNode;
}

export const BottomSheetPickerProvider: React.FC<
  BottomSheetPickerProviderProps
> = ({ children }) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [pickerConfig, setPickerConfig] = useState<PickerConfig | null>(null);

  const openPicker = useCallback((config: PickerConfig) => {
    setPickerConfig(config);
    bottomSheetRef.current?.present();
  }, []);

  const closePicker = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleItemSelect = useCallback(
    (item: BottomSheetPickerItem) => {
      if (!item.disabled) {
        pickerConfig?.onSelect?.(item);
        closePicker();
      }
    },
    [pickerConfig, closePicker],
  );

  const renderItem = useCallback(
    ({ item }: { item: BottomSheetPickerItem }) => (
      <Pressable
        testID={`picker-item-${item.id}`}
        onPress={() => handleItemSelect(item)}
        className={itemVariants({
          className: item.disabled ? "opacity-50" : "",
          selected: pickerConfig?.selectedId === item.id,
        })}
        disabled={item.disabled}
      >
        <View className="flex-1 flex-row items-center gap-3">
          {item.icon && <View>{item.icon}</View>}
          <View className={itemTextVariants()}>
            <Text className={itemTitleVariants()}>{item.title}</Text>
            {item.description && (
              <Text className={itemDescriptionVariants()}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    ),
    [pickerConfig?.selectedId, handleItemSelect],
  );

  const contextValue = useMemo(() => ({ openPicker }), [openPicker]);

  return (
    <BottomSheetPickerContext.Provider value={contextValue}>
      {children}
      <SheetModal ref={bottomSheetRef} snapPoints={SNAP_POINTS}>
        <FlashList
          className={bottomSheetContentVariants()}
          data={pickerConfig?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        />
      </SheetModal>
    </BottomSheetPickerContext.Provider>
  );
};

export interface BottomSheetPickerTriggerProps {
  items: BottomSheetPickerItem[];
  selectedId?: string;
  onSelect?: (item: BottomSheetPickerItem) => void;
  trigger?: ReactNode;
  triggerTitle?: string;
  iconButton?: boolean;
  testID?: string;
  disabled?: boolean;
}

export const BottomSheetPickerTrigger: React.FC<
  BottomSheetPickerTriggerProps
> = ({
  items,
  selectedId,
  onSelect,
  trigger,
  triggerTitle,
  iconButton = false,
  testID,
  disabled,
}) => {
  const t = useTranslations("common");
  const { openPicker } = useBottomSheetPicker();

  const handleOpen = useCallback(() => {
    Keyboard.dismiss();
    openPicker({
      items,
      selectedId,
      onSelect,
    });
  }, [openPicker, items, selectedId, onSelect]);

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId);
  }, [items, selectedId]);

  if (trigger) {
    return (
      <Pressable testID={testID} onPress={handleOpen}>
        {trigger}
      </Pressable>
    );
  }

  if (iconButton) {
    return (
      <Pressable
        testID={testID}
        onPress={handleOpen}
        className={triggerVariants({
          iconButton,
        })}
      >
        {selectedItem?.icon}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={handleOpen}
      disabled={disabled}
      className={triggerVariants({ disabled })}
    >
      {selectedItem?.icon}
      <Text className={triggerTextVariants()}>
        {triggerTitle ?? selectedItem?.title ?? t("select")}
      </Text>
    </Pressable>
  );
};
