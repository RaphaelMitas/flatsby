"use client";

import type { ChatModel } from "@flatsby/validators/models";
import { useState } from "react";
import { CheckIcon } from "lucide-react";

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
  ModelSelectorTrigger,
} from "@flatsby/ui/ai-elements";
import { Badge } from "@flatsby/ui/badge";
import { Button } from "@flatsby/ui/button";
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
  disabled?: boolean;
}

export function ChatModelSelector({
  currentModel,
  onModelChange,
  disabled,
}: ChatModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedModelData = CHAT_MODELS.find((m) => m.id === currentModel);

  // Group models by provider
  const providers = Array.from(new Set(CHAT_MODELS.map((m) => m.provider)));

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
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
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
                ),
              )}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
