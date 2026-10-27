"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, House, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";

import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";

import { useTRPC } from "~/trpc/react";

export function StartOrJoin({ onJoin }: { onJoin: () => void }) {
  const t = useTranslations("group.onboarding");
  const trpc = useTRPC();
  const { data } = useQuery(trpc.user.getCurrentUserWithGroups.queryOptions());
  const firstName = data?.success ? data.data.user?.name.split(" ")[0] : "";

  return (
    <section className="mx-auto flex h-full w-full max-w-md flex-col justify-center gap-8 p-6">
      <h1
        className="text-3xl font-extrabold tracking-tight"
        data-testid="onboarding-title"
      >
        {firstName && (
          <span className="block">{t("greeting", { name: firstName })}</span>
        )}
        {t("question")}
      </h1>

      <div className="flex flex-col gap-3">
        <FlatsbyCat className="-mb-5 h-16 w-auto self-end pr-6" />
        <Choice
          testId="onboarding-start"
          icon={House}
          title={t("start")}
          hint={t("startHint")}
          href="/group/create"
        />
        <Choice
          testId="onboarding-join"
          icon={KeyRound}
          title={t("join")}
          hint={t("joinHint")}
          onClick={onJoin}
        />
      </div>
    </section>
  );
}

const choiceClassName =
  "bg-card hover:bg-muted flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors";

function Choice({
  testId,
  icon: Icon,
  title,
  hint,
  href,
  onClick,
}: {
  testId: string;
  icon: LucideIcon;
  title: string;
  hint: string;
} & (
  { href: string; onClick?: never } | { href?: never; onClick: () => void }
)) {
  const content = (
    <>
      <span className="bg-muted flex size-11 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground text-sm">{hint}</span>
      </span>
      <ChevronRight className="text-muted-foreground size-4" />
    </>
  );

  return href ? (
    <Link href={href} className={choiceClassName} data-testid={testId}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className={choiceClassName}
      data-testid={testId}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
