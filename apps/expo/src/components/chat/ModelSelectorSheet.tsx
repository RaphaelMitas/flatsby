import type { ChatModel } from "@flatsby/validators/models";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetModal as RawBottomSheetModal,
} from "@gorhom/bottom-sheet";
import { tv } from "tailwind-variants";

import { CHAT_MODELS, getModelTier } from "@flatsby/validators/models";

import { Badge } from "~/lib/ui/badge";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Separator } from "~/lib/ui/separator";
import { Switch } from "~/lib/ui/switch";
import { useBottomInset, useThemeColors } from "~/lib/utils";

const itemVariants = tv({
  base: "flex-row items-center gap-3 px-4 py-3 active:bg-muted/50",
  variants: {
    selected: {
      true: "bg-muted",
    },
  },
});

export interface ModelSelectorSheetRef {
  open: () => void;
  close: () => void;
}

interface ModelSelectorSheetProps {
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
  toolsEnabled: boolean;
  onToolsChange: (enabled: boolean) => void;
  hasGroup: boolean;
}

export const ModelSelectorSheet = forwardRef<
  ModelSelectorSheetRef,
  ModelSelectorSheetProps
>(function ModelSelectorSheet(
  { selectedModel, onModelChange, toolsEnabled, onToolsChange, hasGroup },
  ref,
) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { getColor } = useThemeColors();
  const { sheetInset } = useBottomInset();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter models by search (name or provider) and tools preference
  const filteredModels = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return CHAT_MODELS.filter((model) => {
      const matchesSearch =
        model.name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query);
      const matchesTools = !toolsEnabled || model.supportsTools;
      return matchesSearch && matchesTools;
    });
  }, [searchQuery, toolsEnabled]);

  // Group filtered models by provider
  const providers = useMemo(() => {
    return Array.from(new Set(filteredModels.map((m) => m.provider)));
  }, [filteredModels]);

  useImperativeHandle(ref, () => ({
    open: () => bottomSheetRef.current?.present(),
    close: () => bottomSheetRef.current?.dismiss(),
  }));

  const handleModelSelect = useCallback(
    (model: ChatModel) => {
      onModelChange(model);
      bottomSheetRef.current?.dismiss();
    },
    [onModelChange],
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

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: getColor("background"),
      borderWidth: 2,
      borderColor: getColor("muted"),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    }),
    [getColor],
  );

  const handleIndicatorStyle = useMemo(
    () => ({
      backgroundColor: getColor("primary"),
    }),
    [getColor],
  );

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setSearchQuery("");
    }
  }, []);

  return (
    <RawBottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["50%"]}
      enablePanDownToClose
      bottomInset={sheetInset}
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      onChange={handleSheetChange}
    >
      <BottomSheetScrollView className="flex-1">
        <View className="px-4 pb-2">
          <BottomSheetTextInput
            className="bg-muted text-foreground rounded-lg px-3 py-2"
            placeholder="Search models..."
            placeholderTextColor={getColor("muted-foreground")}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {providers.map((provider) => (
          <View key={provider}>
            <Text className="text-muted-foreground px-4 py-2 text-xs font-semibold uppercase">
              {provider}
            </Text>
            {filteredModels
              .filter((model) => model.provider === provider)
              .map((model) => (
                <Pressable
                  key={model.id}
                  onPress={() => handleModelSelect(model.id)}
                  className={itemVariants({
                    selected: selectedModel === model.id,
                  })}
                >
                  <View className="flex-1 flex-row items-center gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-foreground text-base font-medium">
                          {model.name}
                        </Text>
                        <Badge
                          variant="secondary"
                          label={getModelTier(model.id)}
                          size="sm"
                        />
                        {(model.supportsTools as boolean) && (
                          <Badge variant="outline" label="Tools" size="sm" />
                        )}
                      </View>
                    </View>
                    {selectedModel === model.id && (
                      <Icon name="check" size={20} color="primary" />
                    )}
                  </View>
                </Pressable>
              ))}
          </View>
        ))}

        <Separator className="my-2" />
        <View className="px-4 py-3 pb-8">
          {hasGroup ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-foreground text-sm font-medium">
                  Flatsby Tools
                </Text>
                <Text className="text-muted-foreground text-xs">
                  Shopping lists, expenses & more
                </Text>
              </View>
              <Switch checked={toolsEnabled} onCheckedChange={onToolsChange} />
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Icon name="info" size={16} color="muted-foreground" />
              <Text className="text-muted-foreground text-sm">
                Select a group from Home to enable tools
              </Text>
            </View>
          )}
        </View>
      </BottomSheetScrollView>
    </RawBottomSheetModal>
  );
});
