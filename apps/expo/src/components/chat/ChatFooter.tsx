import type { ToolPreferences } from "@flatsby/validators/chat/messages";
import type { ChatModel } from "@flatsby/validators/models";
import { memo, useCallback, useRef, useState } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";

import { CHAT_MODELS, modelSupportsTools } from "@flatsby/validators/models";

import type { ModelSelectorSheetRef } from "./ModelSelectorSheet";
import { AppKeyboardStickyView } from "~/lib/components/keyboard-sticky-view";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn, useThemeColors } from "~/lib/utils";
import { ModelSelectorSheet } from "./ModelSelectorSheet";

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

const ModelAndToolsSelector = memo(function ModelAndToolsSelector({
  selectedModel,
  onModelChange,
  toolsEnabled,
  onToolsChange,
  disabled,
}: {
  selectedModel: ChatModel | null;
  onModelChange: (model: ChatModel) => void;
  toolsEnabled: boolean;
  onToolsChange: (enabled: boolean) => void;
  disabled: boolean;
}) {
  const sheetRef = useRef<ModelSelectorSheetRef>(null);

  const currentModelSupportsTools = selectedModel
    ? modelSupportsTools(selectedModel)
    : false;
  const showToolsEnabled = toolsEnabled && currentModelSupportsTools;

  const handleOpen = useCallback(() => {
    Keyboard.dismiss();
    sheetRef.current?.open();
  }, []);

  return (
    <>
      <View className="flex-row items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onPress={handleOpen}
          disabled={disabled}
        >
          <View className="flex-row items-center gap-1.5">
            <Text className="text-foreground text-sm">
              {getModelDisplayName(selectedModel)}
            </Text>
            {showToolsEnabled && (
              <Icon name="wrench" size={12} color="muted-foreground" />
            )}
            <Icon name="chevron-down" size={14} color="muted-foreground" />
          </View>
        </Button>
      </View>
      <ModelSelectorSheet
        ref={sheetRef}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        toolsEnabled={toolsEnabled}
        onToolsChange={onToolsChange}
      />
    </>
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
  return (
    <View className="flex-row items-center gap-2">
      <ModelAndToolsSelector
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        toolsEnabled={toolPreferences.toolsEnabled ?? true}
        onToolsChange={(enabled) =>
          onToolPreferencesChange({ toolsEnabled: enabled })
        }
        disabled={disabled || isLoading}
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
