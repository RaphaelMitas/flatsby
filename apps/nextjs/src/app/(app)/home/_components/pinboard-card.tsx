"use client";

import Link from "next/link";
import { ChevronRight, Pin } from "lucide-react";
import { useTranslations } from "next-intl";

import { useHomeCardOpened } from "./home-card";

export function PinboardCard({ groupId }: { groupId: number }) {
  const t = useTranslations();
  const opened = useHomeCardOpened(groupId);

  return (
    <Link
      href="/home/pinboard"
      data-testid="home-card-pinboard"
      onClick={() => opened("pinboard")}
      className="bg-card hover:border-foreground/30 flex items-center gap-3 rounded-2xl border py-2 pr-4 pl-2 font-semibold transition-colors"
    >
      <span className="bg-muted grid size-8 place-items-center rounded-full">
        <Pin className="size-4" />
      </span>
      <span className="flex-1">{t("pinboard.title")}</span>
      <ChevronRight className="text-muted-foreground size-4" />
    </Link>
  );
}
