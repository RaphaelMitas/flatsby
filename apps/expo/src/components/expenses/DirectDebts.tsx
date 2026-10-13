import type {
  CounterpartDebts,
  DebtKind,
} from "@flatsby/validators/expenses/debt";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";

import {
  describePairActivity,
  formatCurrencyFromCents,
  formatSignedCents,
} from "@flatsby/validators/expenses/formatting";

import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { MemberAvatar } from "./MemberAvatar";

export type OnSettle = (debt: DebtEntry) => void;

interface DirectDebtsProps {
  groupId: number;
  meId: number;
  kind: DebtKind;
  counterparts: CounterpartDebts[];
  allSquare: string;
  person: PersonLookup;
  onSettle: OnSettle;
}

export function DirectDebts({
  groupId,
  meId,
  kind,
  counterparts,
  allSquare,
  person,
  onSettle,
}: DirectDebtsProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandable = kind === "direct";

  if (counterparts.length === 0) {
    return (
      <Card className="flex-row items-center gap-3 p-4">
        <View className="bg-success/10 h-9 w-9 items-center justify-center rounded-full">
          <Icon name="check" size={18} color="success" />
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-semibold">
            You're all square
          </Text>
          <Text className="text-muted-foreground text-sm">{allSquare}</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {counterparts.map((counterpart, index) => (
        <DirectDebtRow
          key={counterpart.groupMemberId}
          groupId={groupId}
          meId={meId}
          counterpart={counterpart}
          person={person}
          divided={index > 0}
          expanded={expandable && expandedId === counterpart.groupMemberId}
          onToggle={
            expandable
              ? () =>
                  setExpandedId((current) =>
                    current === counterpart.groupMemberId
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
  divided: boolean;
  expanded: boolean;
  onToggle?: () => void;
  onSettle: OnSettle;
}

function DirectDebtRow({
  groupId,
  meId,
  counterpart,
  person,
  divided,
  expanded,
  onToggle,
  onSettle,
}: DirectDebtRowProps) {
  const otherId = counterpart.groupMemberId;
  const other = person(otherId);

  return (
    <View testID="debt-row" className={cn(divided && "border-border border-t")}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          testID="debt-row-toggle"
          accessibilityRole="button"
          accessibilityState={onToggle && { expanded }}
          disabled={!onToggle}
          onPress={onToggle}
          className="flex-1 flex-row items-center gap-3"
        >
          <MemberAvatar person={other} className="h-9 w-9" />
          <View className="flex-1">
            <View className="flex-row items-center gap-1">
              <Text
                className="text-foreground shrink font-semibold"
                numberOfLines={1}
              >
                {other.name}
              </Text>
              {onToggle && (
                <Icon
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="muted-foreground"
                />
              )}
            </View>
            <Text className="text-muted-foreground text-sm">
              {counterpart.direction}
            </Text>
          </View>
        </Pressable>
        <View className="items-end gap-2">
          {counterpart.amounts.map(({ amountInCents, debt }) => (
            <View key={debt.currency} className="flex-row items-center gap-3">
              <Text
                className={cn(
                  "text-base font-semibold",
                  amountInCents > 0 ? "text-success" : "text-destructive",
                )}
              >
                {formatCurrencyFromCents({
                  cents: debt.amountInCents,
                  currency: debt.currency,
                })}
              </Text>
              <Button
                testID="debt-settle"
                accessibilityLabel={`Settle ${debt.currency} with ${other.name}`}
                title="Settle"
                size="sm"
                variant="outline"
                onPress={() => onSettle(debt)}
              />
            </View>
          ))}
        </View>
      </View>
      {expanded && (
        <PairActivityList
          groupId={groupId}
          meId={meId}
          otherId={otherId}
          person={person}
        />
      )}
    </View>
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

  let message: string | undefined;
  if (data?.pages[0]?.success === false || (isError && !data)) {
    message = "Couldn't load recent activity";
  } else if (items?.length === 0) {
    message = "Nothing shared yet";
  }

  return (
    <View testID="debt-row-activity" className="bg-muted/40 px-4 pb-2">
      {message ? (
        <Text className="text-muted-foreground py-2 text-sm">{message}</Text>
      ) : !items ? (
        <View className="gap-2 py-2">
          <Skeleton size="sm" width="xl" />
          <Skeleton size="sm" width="lg" />
        </View>
      ) : (
        items.map((item, index) => {
          const { cents, title, subtitle } = describePairActivity(
            item,
            meId,
            person,
          );
          return (
            <View
              key={item.id}
              className={cn(
                "flex-row items-center gap-3 py-2",
                index > 0 && "border-border border-t border-dashed",
              )}
            >
              <MemberAvatar
                person={person(item.paidByGroupMemberId)}
                className="h-7 w-7"
                textClassName="text-xs"
              />
              <View className="flex-1">
                <Text className="text-foreground text-sm" numberOfLines={1}>
                  {title}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {subtitle}
                </Text>
              </View>
              <Text
                className={cn(
                  "text-sm font-semibold",
                  item.isSettlement
                    ? "text-muted-foreground"
                    : cents > 0
                      ? "text-success"
                      : "text-destructive",
                )}
              >
                {formatSignedCents(cents, item.currency)}
              </Text>
            </View>
          );
        })
      )}
      {hasNextPage && (
        <Button
          testID="pair-activity-more"
          title={isFetchingNextPage ? "Loading…" : "Show more"}
          size="sm"
          variant="ghost"
          disabled={isFetching}
          onPress={() => void fetchNextPage()}
        />
      )}
    </View>
  );
}
