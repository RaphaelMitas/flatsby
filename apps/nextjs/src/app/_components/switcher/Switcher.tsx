"use client";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronsUpDown, Ellipsis } from "lucide-react";

import { cn } from "@flatsby/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";

export interface SwitcherItem {
  id: number;
  title: string;
  subtitle: string;
}

export interface SwitcherAction {
  testId: string;
  icon: LucideIcon;
  title: string;
  onSelect: () => void;
}

export function Switcher({
  testId,
  icon: Icon,
  title,
  subtitle,
  menuTitle,
  caption,
  items,
  selectedId,
  onSelect,
  onMore,
  moreLabel,
  actions,
  disabled,
  className,
}: {
  testId: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  menuTitle: string;
  caption?: string;
  items: SwitcherItem[];
  selectedId: number | null;
  onSelect: (item: SwitcherItem) => void;
  onMore?: (item: SwitcherItem) => void;
  moreLabel?: (item: SwitcherItem) => string;
  actions: SwitcherAction[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid={testId}
        disabled={disabled}
        className={cn(
          "bg-card hover:bg-muted flex w-full min-w-0 items-center gap-3 rounded-2xl border p-2.5 text-left shadow-sm transition-colors",
          className,
        )}
      >
        <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold">{title}</span>
          <span className="text-muted-foreground text-xs">{subtitle}</span>
        </span>
        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
          <ChevronsUpDown className="size-4" />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-72 rounded-2xl p-2"
      >
        <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
          <span className="text-lg font-extrabold">{menuTitle}</span>
          {caption && (
            <span className="text-muted-foreground text-sm">{caption}</span>
          )}
        </div>

        {items.map((item) => {
          const current = item.id === selectedId;
          return (
            <div key={item.id} className="flex items-center">
              <DropdownMenuItem
                data-testid={`${testId}-item-${item.id}`}
                onSelect={() => onSelect(item)}
                className="flex-1 gap-3 rounded-xl p-2"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    current ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{item.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {item.subtitle}
                  </span>
                </span>
                {current && <Check className="size-4" />}
              </DropdownMenuItem>
              {onMore && (
                <DropdownMenuItem
                  data-testid={`${testId}-more-${item.id}`}
                  aria-label={moreLabel?.(item)}
                  onSelect={() => onMore(item)}
                  className="size-9 justify-center rounded-xl p-0"
                >
                  <Ellipsis className="text-muted-foreground size-4" />
                </DropdownMenuItem>
              )}
            </div>
          );
        })}

        <DropdownMenuSeparator className="my-2" />

        {actions.map(
          ({ testId: actionTestId, icon: ActionIcon, ...action }) => (
            <DropdownMenuItem
              key={actionTestId}
              data-testid={actionTestId}
              onSelect={action.onSelect}
              className="gap-3 rounded-xl p-2"
            >
              <span className="border-muted-foreground text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed">
                <ActionIcon className="size-4" />
              </span>
              <span className="font-semibold">{action.title}</span>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
