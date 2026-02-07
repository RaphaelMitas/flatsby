"use client";

import type { SelectorOption } from "@flatsby/validators/chat/tools";
import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";

interface UISelectorProps {
  title?: string;
  options: SelectorOption[];
  multiSelect?: boolean;
  disabled?: boolean;
  onSelect: (selectedIds: string[]) => void;
  hasResponded?: boolean;
  previousResponse?: string[];
}

export function UISelector({
  title,
  options,
  multiSelect = false,
  disabled = false,
  onSelect,
  hasResponded = false,
  previousResponse,
}: UISelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(previousResponse ?? []),
  );

  const handleSelect = (id: string) => {
    if (hasResponded || disabled) return;

    if (multiSelect) {
      const newSelected = new Set(selected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelected(newSelected);
    } else {
      // Single select - immediately submit
      onSelect([id]);
    }
  };

  const handleSubmitMulti = () => {
    if (selected.size > 0) {
      onSelect(Array.from(selected));
    }
  };

  // Show read-only state if already responded
  if (hasResponded && previousResponse) {
    const selectedLabels = previousResponse
      .map((id) => options.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    return (
      <Card className="my-2 max-w-sm">
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={title ? "pt-0" : ""}>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Check className="size-4 text-green-500" />
            Selected: {selectedLabels}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2 max-w-sm">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.id}
              variant={selected.has(option.id) ? "primary" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => handleSelect(option.id)}
              className="gap-1"
            >
              {selected.has(option.id) && <Check className="size-3" />}
              {option.label}
            </Button>
          ))}
        </div>
        {selected.size > 0 &&
          options.find((o) => selected.has(o.id))?.description && (
            <p className="text-muted-foreground mt-1 text-xs">
              {options.find((o) => selected.has(o.id))?.description}
            </p>
          )}
        {multiSelect && selected.size > 0 && (
          <Button
            size="sm"
            className="mt-2"
            disabled={disabled}
            onClick={handleSubmitMulti}
          >
            Confirm selection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
