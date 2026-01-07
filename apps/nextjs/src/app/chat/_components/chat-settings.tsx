"use client";

import type { ChatSettings } from "@flatsby/validators/chat";
import { Settings, ShoppingCart } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";

interface ChatSettingsDropdownProps {
  settings: ChatSettings;
  onSettingsChange: (settings: Partial<ChatSettings>) => void;
  disabled?: boolean;
}

export function ChatSettingsDropdown({
  settings,
  onSettingsChange,
  disabled,
}: ChatSettingsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disabled}
        >
          <Settings className="size-4" />
          <span className="sr-only">Chat settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Features</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={settings.shoppingListToolEnabled}
          onCheckedChange={(checked) =>
            onSettingsChange({ shoppingListToolEnabled: checked })
          }
        >
          <ShoppingCart className="mr-2 size-4" />
          Shopping List Helper
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
