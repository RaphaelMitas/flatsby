"use client";

import type { ChatModel } from "@flatsby/validators/models";
import { useMemo, useState } from "react";
import { CheckIcon, WrenchIcon } from "lucide-react";

import { cn } from "@flatsby/ui";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorSeparator,
  ModelSelectorTrigger,
} from "@flatsby/ui/ai-elements";
import { Badge } from "@flatsby/ui/badge";
import { Button } from "@flatsby/ui/button";
import { Label } from "@flatsby/ui/label";
import { Switch } from "@flatsby/ui/switch";
import { CHAT_MODELS } from "@flatsby/validators/models";

export function getModelDisplayName(
  modelId: string | null | undefined,
): string {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId ?? "Unknown Model";
}

export function getModelProvider(
  modelId: string | null | undefined,
): string | undefined {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.provider;
}

interface ChatModelSelectorProps {
  currentModel: string | null;
  onModelChange: (model: ChatModel) => void;
  toolsEnabled: boolean;
  onToolsChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function ChatModelSelector({
  currentModel,
  onModelChange,
  toolsEnabled,
  onToolsChange,
  disabled,
}: ChatModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedModelData = CHAT_MODELS.find((m) => m.id === currentModel);

  // Filter models: when tools are enabled, only show models that support tools
  const filteredModels = useMemo(() => {
    if (!toolsEnabled) return CHAT_MODELS;
    return CHAT_MODELS.filter((model) => model.supportsTools);
  }, [toolsEnabled]);

  // Group filtered models by provider
  const providers = useMemo(() => {
    return Array.from(new Set(filteredModels.map((m) => m.provider)));
  }, [filteredModels]);

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 justify-between gap-1.5 px-2 text-xs"
          disabled={disabled}
        >
          {selectedModelData?.provider && (
            <ModelSelectorLogo provider={selectedModelData.provider} />
          )}
          <ModelSelectorName>
            {selectedModelData?.name ?? "Select Model"}
          </ModelSelectorName>
          {toolsEnabled && (
            <WrenchIcon className="text-muted-foreground size-3" />
          )}
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {providers.map((provider) => (
            <ModelSelectorGroup heading={provider} key={provider}>
              {filteredModels
                .filter((model) => model.provider === provider)
                .map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    value={model.id}
                    onSelect={() => {
                      onModelChange(model.id);
                      setOpen(false);
                    }}
                  >
                    <ModelSelectorLogo provider={model.provider} />
                    <ModelSelectorName>
                      {model.name}
                      {model.supportsTools && (
                        <Badge className="ml-2 text-xs" variant="outline">
                          Tools
                        </Badge>
                      )}
                    </ModelSelectorName>

                    {currentModel === model.id ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
            </ModelSelectorGroup>
          ))}
          <ModelSelectorSeparator />
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tools-toggle" className="text-sm font-medium">
                  Flatsby Tools
                </Label>
                <p className="text-muted-foreground text-xs">
                  Shopping lists, expenses & more
                </p>
              </div>
              <Switch
                id="tools-toggle"
                checked={toolsEnabled}
                onCheckedChange={onToolsChange}
                className={cn(
                  toolsEnabled && "data-[state=checked]:bg-primary",
                )}
              />
            </div>
          </div>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
