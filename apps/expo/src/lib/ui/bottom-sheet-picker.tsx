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
import BottomSheetRaw, {
  BottomSheetBackdrop,
  useBottomSheetScrollableCreator,
} from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { styled } from "nativewind";
import { tv } from "tailwind-variants";

import { useBottomInset, useThemeColors } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const BottomSheet = styled(BottomSheetRaw, {
  className: {
    target: "backgroundStyle",
  },
});

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
  },
});

const triggerTextVariants = tv({
  base: "text-foreground",
});

const bottomSheetVariants = tv({
  base: "bg-background border-2 border-muted rounded-t-3xl",
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

export interface BottomSheetPickerRef {
  open: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
}

// Context for connecting trigger and sheet
interface BottomSheetPickerContextValue {
  openPicker: (config: {
    items: BottomSheetPickerItem[];
    selectedId?: string;
    onSelect?: (item: BottomSheetPickerItem) => void;
    snapPoints?: string[];
  }) => void;
  closePicker: () => void;
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

// Provider component that should be placed high in the component tree
interface BottomSheetPickerProviderProps {
  children: ReactNode;
}

// Component that uses the hook inside BottomSheet context
interface BottomSheetPickerContentProps {
  items: BottomSheetPickerItem[];
  renderItem: ({ item }: { item: BottomSheetPickerItem }) => React.ReactElement;
}

const BottomSheetPickerContent: React.FC<BottomSheetPickerContentProps> = ({
  items,
  renderItem,
}) => {
  const BottomSheetScrollable = useBottomSheetScrollableCreator();

  return (
    <FlashList
      className={bottomSheetContentVariants()}
      data={items}
      keyExtractor={(item: BottomSheetPickerItem) => item.id}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      renderScrollComponent={BottomSheetScrollable}
    />
  );
};

export const BottomSheetPickerProvider: React.FC<
  BottomSheetPickerProviderProps
> = ({ children }) => {
  const bottomSheetRef = useRef<BottomSheetRaw>(null);
  const [pickerConfig, setPickerConfig] = useState<{
    items: BottomSheetPickerItem[];
    selectedId?: string;
    onSelect?: (item: BottomSheetPickerItem) => void;
    snapPoints: string[];
  } | null>(null);
  const { getColor } = useThemeColors();
  const { sheetInset } = useBottomInset();

  const openPicker = useCallback(
    (config: {
      items: BottomSheetPickerItem[];
      selectedId?: string;
      onSelect?: (item: BottomSheetPickerItem) => void;
      snapPoints?: string[];
    }) => {
      setPickerConfig({
        ...config,
        snapPoints: config.snapPoints ?? ["50%", "80%"],
      });
      bottomSheetRef.current?.snapToIndex(0);
    },
    [],
  );

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

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const contextValue = useMemo(
    () => ({
      openPicker,
      closePicker,
    }),
    [openPicker, closePicker],
  );

  return (
    <BottomSheetPickerContext.Provider value={contextValue}>
      {children}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={pickerConfig?.snapPoints ?? ["50%", "80%"]}
        index={-1}
        enablePanDownToClose
        bottomInset={sheetInset}
        className={bottomSheetVariants()}
        handleIndicatorStyle={{
          backgroundColor: getColor("primary"),
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetPickerContent
          items={pickerConfig?.items ?? []}
          renderItem={renderItem}
        />
      </BottomSheet>
    </BottomSheetPickerContext.Provider>
  );
};

export interface BottomSheetPickerTriggerProps {
  items: BottomSheetPickerItem[];
  selectedId?: string;
  onSelect?: (item: BottomSheetPickerItem) => void;
  trigger?: ReactNode;
  triggerTitle?: string;
  snapPoints?: string[];
  iconButton?: boolean;
}

export const BottomSheetPickerTrigger: React.FC<
  BottomSheetPickerTriggerProps
> = ({
  items,
  selectedId,
  onSelect,
  trigger,
  triggerTitle,
  snapPoints,
  iconButton = false,
}) => {
  const { openPicker } = useBottomSheetPicker();

  const handleOpen = useCallback(() => {
    Keyboard.dismiss();
    openPicker({
      items,
      selectedId,
      onSelect,
      snapPoints,
    });
  }, [openPicker, items, selectedId, onSelect, snapPoints]);

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId);
  }, [items, selectedId]);

  if (trigger) {
    return <Pressable onPress={handleOpen}>{trigger}</Pressable>;
  }

  if (iconButton) {
    return (
      <Pressable
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
    <Pressable onPress={handleOpen} className={triggerVariants()}>
      {selectedItem?.icon}
      <Text className={triggerTextVariants()}>
        {triggerTitle ?? selectedItem?.title ?? "Select"}
      </Text>
    </Pressable>
  );
};
