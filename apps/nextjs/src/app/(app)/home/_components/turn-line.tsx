"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { useHomeCalendar } from "./use-home-calendar";

export function TurnLine({
  groupId,
  today,
}: {
  groupId: number;
  today: string | null;
}) {
  const t = useTranslations();
  const calendar = useHomeCalendar(groupId, today);
  const [first, ...rest] = calendar?.due ?? [];
  if (!first || !today) return null;

  return (
    <Link
      href="/calendar"
      data-testid="home-turn"
      className="flex items-center gap-2 px-1 text-sm"
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          categoryFillColorMap[first.item.color],
        )}
      />
      <span className="line-clamp-1 font-semibold">{first.item.title}</span>
      <span className="text-muted-foreground shrink-0">
        {t("calendar.yourTurn")}
        {rest.length > 0 && ` · ${t("home.more", { count: rest.length })}`}
      </span>
      <ChevronRight className="text-muted-foreground ml-auto size-4 shrink-0" />
    </Link>
  );
}
