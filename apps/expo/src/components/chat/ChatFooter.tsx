import type { ToolPreferences } from "@flatsby/validators/chat/messages";
import type { ChatModel } from "@flatsby/validators/models";
import { memo, useCallback, useState } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";

import { CHAT_MODELS, modelSupportsTools } from "@flatsby/validators/models";

import { AppKeyboardStickyView } from "~/lib/components/keyboard-sticky-view";
import { useBottomSheetPicker } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import { cn, useThemeColors } from "~/lib/utils";

type PromptStatus = "ready" | "submitted" | "streaming" | "error";

interface ChatFooterProps {
  sendMessage: (text: string) => void;
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
  toolPreferences: ToolPreferences;
  onToolPreferencesChange: (prefs: Partial<ToolPreferences>) => void;
  status: PromptStatus;
  disabled?: boolean;
  error?: string | null;
}

function getModelDisplayName(modelId: string | null | undefined): string {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId ?? "Select Model";
}

const ModelSelectorButton = memo(function ModelSelectorButton({
  selectedModel,
  onModelChange,
  disabled,
}: {
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
  disabled: boolean;
}) {
  const { openPicker } = useBottomSheetPicker();

  const modelItems = CHAT_MODELS.map((model) => ({
    id: model.id,
    title: model.name,
    description: model.supportsTools ? "Supports tools" : undefined,
  }));

  const handleOpen = useCallback(() => {
    Keyboard.dismiss();
    openPicker({
      items: modelItems,
      selectedId: selectedModel ?? undefined,
      onSelect: (item) => onModelChange(item.id as ChatModel),
      snapPoints: ["35%"],
    });
  }, [openPicker, modelItems, selectedModel, onModelChange]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={handleOpen}
      disabled={disabled}
      title={getModelDisplayName(selectedModel)}
      icon="chevron-down"
    />
  );
});

const ToolToggleButton = memo(function ToolToggleButton({
  enabled,
  onToggle,
  disabled,
  iconName,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
  iconName: "shopping-cart" | "wallet";
}) {
  return (
    <Button
      variant={enabled && !disabled ? "secondary" : "ghost"}
      size="icon"
      onPress={onToggle}
      disabled={disabled}
      icon={iconName}
      className="p-3"
    />
  );
});

const ChatToolbar = memo(function ChatToolbar({
  selectedModel,
  onModelChange,
  toolPreferences,
  onToolPreferencesChange,
  disabled,
  isLoading,
}: {
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
  toolPreferences: ToolPreferences;
  onToolPreferencesChange: (prefs: Partial<ToolPreferences>) => void;
  disabled: boolean;
  isLoading: boolean;
}) {
  const toolsSupported = selectedModel
    ? modelSupportsTools(selectedModel)
    : false;

  return (
    <View className="flex-row items-center gap-2">
      <ModelSelectorButton
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        disabled={disabled || isLoading}
      />
      <ToolToggleButton
        enabled={toolPreferences.shoppingListToolsEnabled ?? true}
        onToggle={() =>
          onToolPreferencesChange({
            shoppingListToolsEnabled: !toolPreferences.shoppingListToolsEnabled,
          })
        }
        disabled={disabled || isLoading || !toolsSupported}
        iconName="shopping-cart"
      />
      <ToolToggleButton
        enabled={toolPreferences.expenseToolsEnabled ?? true}
        onToggle={() =>
          onToolPreferencesChange({
            expenseToolsEnabled: !toolPreferences.expenseToolsEnabled,
          })
        }
        disabled={disabled || isLoading || !toolsSupported}
        iconName="wallet"
      />
    </View>
  );
});

export const ChatFooter = memo(function ChatFooter({
  sendMessage,
  selectedModel,
  onModelChange,
  toolPreferences,
  onToolPreferencesChange,
  status,
  disabled = false,
  error,
}: ChatFooterProps) {
  const [input, setInput] = useState("");
  const { getColor } = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);
  const isLoading = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !isLoading && !disabled;

  const handleSubmit = useCallback(() => {
    if (!canSend) return;
    sendMessage(input);
    setInput("");
    Keyboard.dismiss();
  }, [canSend, input, sendMessage]);

  return (
    <AppKeyboardStickyView disabled={!isFocused}>
      <View
        className={cn({
          "border-border border-t": !isFocused,
        })}
      >
        {error && (
          <View className="border-destructive bg-destructive/10 mx-4 mt-4 rounded-lg border p-3">
            <Text className="text-destructive text-sm">{error}</Text>
          </View>
        )}

        <View className="p-4">
          <Card className="pt-4">
            <TextInput
              className={cn("text-foreground max-h-64 min-h-[44px] px-4 py-3", {
                "bg-transparent": isFocused,
              })}
              placeholder="Type your message..."
              placeholderTextColor={getColor("muted-foreground")}
              value={input}
              onChangeText={setInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              multiline
              maxLength={2000}
              editable={!disabled && !isLoading}
              onSubmitEditing={handleSubmit}
              submitBehavior="blurAndSubmit"
            />
            <View className="border-border flex-row items-center justify-between border-t px-3 py-2">
              <ChatToolbar
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                toolPreferences={toolPreferences}
                onToolPreferencesChange={onToolPreferencesChange}
                disabled={disabled}
                isLoading={isLoading}
              />
              <Button
                variant={canSend ? "primary" : "ghost"}
                size="icon"
                onPress={handleSubmit}
                disabled={!canSend}
                icon={isLoading ? "loader" : "arrow-up"}
                className="p-3"
              />
            </View>
          </Card>
        </View>
      </View>
    </AppKeyboardStickyView>
  );
});
