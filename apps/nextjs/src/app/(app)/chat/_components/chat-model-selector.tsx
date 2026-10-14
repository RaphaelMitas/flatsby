"use client";

import type { ChatModel } from "@flatsby/validators/models";
import { useMemo, useState } from "react";
import { CheckIcon, InfoIcon, WrenchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { CHAT_MODELS, getModelTier } from "@flatsby/validators/models";

export function getModelDisplayName(modelId: ChatModel): string {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId;
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
  hasGroup?: boolean;
}

export function ChatModelSelector({
  currentModel,
  onModelChange,
  toolsEnabled,
  onToolsChange,
  disabled,
  hasGroup = false,
}: ChatModelSelectorProps) {
  const t = useTranslations("chat.modelSelector");
  const [open, setOpen] = useState(false);

  const selectedModelData = CHAT_MODELS.find((m) => m.id === currentModel);

  const providers = useMemo(() => {
    return Array.from(new Set(CHAT_MODELS.map((m) => m.provider)));
  }, []);

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
            {selectedModelData?.name ?? t("selectModel")}
          </ModelSelectorName>
          {toolsEnabled && (
            <WrenchIcon className="text-muted-foreground size-3" />
          )}
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder={t("searchModels")} />
        <ModelSelectorList>
          <ModelSelectorEmpty>{t("noModels")}</ModelSelectorEmpty>
          {providers.map((provider) => (
            <ModelSelectorGroup heading={provider} key={provider}>
              {CHAT_MODELS.filter((model) => model.provider === provider).map(
                (model) => (
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
                      <Badge className="ml-2 text-xs" variant="secondary">
                        {t(`tier.${getModelTier(model.id)}`)}
                      </Badge>
                      <Badge className="ml-1 text-xs" variant="outline">
                        {t("tools")}
                      </Badge>
                    </ModelSelectorName>

                    {currentModel === model.id ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ),
              )}
            </ModelSelectorGroup>
          ))}
          <ModelSelectorSeparator />
          <div className="p-3">
            {hasGroup ? (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tools-toggle" className="text-sm font-medium">
                    {t("flatsbyTools")}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {t("flatsbyToolsDescription")}
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
            ) : (
              <div className="text-muted-foreground flex items-center gap-2">
                <InfoIcon className="size-4" />
                <span className="text-sm">{t("selectGroupForTools")}</span>
              </div>
            )}
          </div>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
