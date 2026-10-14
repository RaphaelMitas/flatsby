"use client";

import type {
  CounterpartDebts,
  DebtKind,
} from "@flatsby/validators/expenses/debt";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type { PairActivityItem } from "@flatsby/validators/expenses/schemas";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import type { ReactNode } from "react";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import { Skeleton } from "@flatsby/ui/skeleton";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  describePairActivity,
  formatCurrencyFromCents,
  formatSignedCents,
} from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import { amountTone } from "./debtDisplay";

interface DirectDebtsCardProps {
  groupId: number;
  meId: number;
  kind: DebtKind;
  debts: CounterpartDebts[];
  allSquare: string;
  person: PersonLookup;
  onSettle: (debt: DebtEntry) => void;
}

export function DirectDebtsCard({
  groupId,
  meId,
  kind,
  debts,
  allSquare,
  person,
  onSettle,
}: DirectDebtsCardProps) {
  const t = useTranslations("debts");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandable = kind === "direct";

  if (debts.length === 0) {
    return (
      <Card
        className="flex items-center gap-3 p-4"
        data-testid="debt-all-square"
      >
        <span className="bg-success/15 text-success flex size-9 shrink-0 items-center justify-center rounded-full">
          <Check className="size-5" />
        </span>
        <div>
          <p className="font-semibold">{t("allSquare")}</p>
          <p className="text-muted-foreground text-sm">{allSquare}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="divide-y overflow-hidden">
      {debts.map((counterpart) => (
        <DirectDebtRow
          key={counterpart.groupMemberId}
          groupId={groupId}
          meId={meId}
          counterpart={counterpart}
          person={person}
          expanded={expandable && expandedId === counterpart.groupMemberId}
          onToggle={
            expandable
              ? () =>
                  setExpandedId((id) =>
                    id === counterpart.groupMemberId
                      ? null
                      : counterpart.groupMemberId,
                  )
              : undefined
          }
          onSettle={onSettle}
        />
      ))}
    </Card>
  );
}

interface DirectDebtRowProps {
  groupId: number;
  meId: number;
  counterpart: CounterpartDebts;
  person: PersonLookup;
  expanded: boolean;
  onToggle?: () => void;
  onSettle: (debt: DebtEntry) => void;
}

function DirectDebtRow({
  groupId,
  meId,
  counterpart,
  person,
  expanded,
  onToggle,
  onSettle,
}: DirectDebtRowProps) {
  const t = useTranslations("debts");
  const locale = useLocale();
  const { groupMemberId, amounts, direction } = counterpart;
  const { name, image } = person(groupMemberId);

  return (
    <div data-testid="direct-debt-row">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!onToggle}
          aria-expanded={onToggle && expanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <UserAvatar name={name} image={image} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-semibold">
              <span className="truncate">{name}</span>
              {onToggle && (
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-4 shrink-0 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              )}
            </div>
            <p className="text-muted-foreground text-sm">{direction}</p>
          </div>
        </button>
        <div className="flex flex-col items-end gap-2">
          {amounts.map(({ amountInCents, debt }) => (
            <div key={debt.currency} className="flex items-center gap-3">
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  amountTone(amountInCents),
                )}
              >
                {formatCurrencyFromCents({
                  cents: debt.amountInCents,
                  currency: debt.currency,
                  locale,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                data-testid="direct-debt-settle"
                onClick={() => onSettle(debt)}
              >
                {t("settle")}
              </Button>
            </div>
          ))}
        </div>
      </div>
      {expanded && (
        <PairActivityList
          groupId={groupId}
          meId={meId}
          otherId={groupMemberId}
          person={person}
        />
      )}
    </div>
  );
}

interface PairActivityListProps {
  groupId: number;
  meId: number;
  otherId: number;
  person: PersonLookup;
}

function PairActivityList({
  groupId,
  meId,
  otherId,
  person,
}: PairActivityListProps) {
  const trpc = useTRPC();
  const t = useTranslations("debts");
  const {
    data,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery(
    trpc.expense.getPairActivity.infiniteQueryOptions(
      { groupId, groupMemberIds: [meId, otherId] },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success ? lastPage.data.nextCursor : undefined,
      },
    ),
  );
  const items = data?.pages.flatMap((page) =>
    page.success ? page.data.items : [],
  );

  let content: ReactNode;
  if (data?.pages[0]?.success === false || (isError && !data)) {
    content = <EmptyLine>{t("activityLoadFailed")}</EmptyLine>;
  } else if (!items) {
    content = Array.from({ length: 2 }).map((_, i) => (
      <li key={i} className="flex items-center gap-3 py-2">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-14" />
      </li>
    ));
  } else if (items.length === 0) {
    content = <EmptyLine>{t("nothingShared")}</EmptyLine>;
  } else {
    content = items.map((item) => (
      <PairActivityLine key={item.id} item={item} meId={meId} person={person} />
    ));
  }

  return (
    <div className="bg-muted/40 border-t px-4 py-1">
      <ul className="divide-y divide-dashed" data-testid="pair-activity">
        {content}
      </ul>
      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mb-1 w-full"
          disabled={isFetching}
          onClick={() => void fetchNextPage()}
          data-testid="pair-activity-more"
        >
          {isFetchingNextPage ? t("loadingMore") : t("showMore")}
        </Button>
      )}
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <li className="text-muted-foreground py-2 text-sm">{children}</li>;
}

function PairActivityLine({
  item,
  meId,
  person,
}: {
  item: PairActivityItem;
  meId: number;
  person: PersonLookup;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { cents, title, subtitle } = describePairActivity(
    item,
    meId,
    person,
    t,
    locale,
  );
  const payer = person(item.paidByGroupMemberId);

  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <UserAvatar name={payer.name} image={payer.image} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate">{title}</p>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
      <span
        className={cn(
          "font-semibold tabular-nums",
          item.isSettlement ? "text-muted-foreground" : amountTone(cents),
        )}
      >
        {formatSignedCents(cents, item.currency, locale)}
      </span>
    </li>
  );
}
