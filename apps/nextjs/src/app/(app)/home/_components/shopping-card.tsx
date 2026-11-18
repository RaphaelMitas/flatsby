"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { getCategoryData } from "@flatsby/ui/categories";
import { Skeleton } from "@flatsby/ui/skeleton";
import { categoryIds } from "@flatsby/validators/categories";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { HomeCard, PaceNumbers, useHomePace } from "./home-card";
import { PaceChart } from "./pace-chart";

const STACK_SIZE = 4;

export function ShoppingCard({
  groupId,
  today,
}: {
  groupId: number;
  today: string | null;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const { currentShoppingList } = useGroupContext();
  const pace = useHomePace(groupId, today);
  const { data: listsData } = useQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
  );
  const lists = listsData?.success ? listsData.data : [];
  const list =
    lists.find(({ id }) => id === currentShoppingList?.id) ?? lists[0];
  const { data: countsData } = useQuery(
    trpc.shoppingList.getCategoryCounts.queryOptions(
      list ? { groupId, shoppingListId: list.id } : skipToken,
    ),
  );
  const counts = countsData?.success ? countsData.data.counts : undefined;
  const stack = categoryIds
    .map((id) => ({ id, count: counts?.[id] ?? 0 }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, STACK_SIZE);
  const shownList = today ? list : undefined;

  return (
    <HomeCard
      href={shownList ? `/shopping-list/${shownList.id}` : "/shopping-list"}
      title={t("navigation.shopping")}
      testId="home-card-shopping"
    >
      <PaceNumbers
        pace={pace?.itemsBought}
        today={today}
        format={String}
        unit={(count) => t("home.itemsBought", { count })}
      />
      {pace && today ? (
        <PaceChart pace={pace.itemsBought} today={today} className="h-12" />
      ) : (
        <Skeleton className="mt-2 h-12" />
      )}
      {shownList && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {shownList.uncheckedItemLength > 0 && (
            <span className="flex -space-x-2">
              {stack.map(({ id }) => {
                const category = getCategoryData(id);
                return (
                  <span
                    key={id}
                    className="bg-card ring-card rounded-full ring-2"
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-full bg-current/15",
                        category.colorClasses.base,
                      )}
                    >
                      <category.icon className="size-4" />
                    </span>
                  </span>
                );
              })}
            </span>
          )}
          <span className="line-clamp-1 font-semibold">{shownList.name}</span>
          <span className="text-muted-foreground ml-auto shrink-0">
            {shownList.uncheckedItemLength > 0
              ? t("home.open", { count: shownList.uncheckedItemLength })
              : t("home.nothingToBuy")}
          </span>
        </div>
      )}
    </HomeCard>
  );
}
