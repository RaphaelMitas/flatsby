"use client";

import type { RouterOutputs, ShoppingListInfiniteData } from "@flatsby/api";
import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import type { ShoppingListItem as ShoppingListItemType } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import { redirect } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { InView } from "react-intersection-observer";

import { cn } from "@flatsby/ui";
import { CategoryFilter, CategoryFilterSidebar } from "@flatsby/ui/categories";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import ShoppingListItem from "./ShoppingListItem";
import { ShoppingListItemAddForm } from "./ShoppingListItemAddForm";
import { groupShoppingList } from "./ShoppingListUtils";
import { useShoppingListInvalidation } from "./useShoppingListInvalidation";

const ShoppingList = ({ shoppingListId }: { shoppingListId: number }) => {
  const { currentGroup, isLoading } = useGroupContext();
  const trpc = useTRPC();

  const { data: shoppingListData } = useSuspenseQuery(
    trpc.shoppingList.getShoppingList.queryOptions({
      groupId: currentGroup?.id ?? 0,
      shoppingListId,
    }),
  );

  if (!currentGroup) {
    // The group context query may still be in flight on a hard page load;
    // only redirect once it has actually resolved without a group.
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      );
    }
    redirect("/group");
  }

  if (!shoppingListData.success) {
    return redirect("/shopping-list");
  }

  return (
    <ShoppingListInner
      shoppingListId={shoppingListId}
      groupId={currentGroup.id}
      shoppingListData={shoppingListData}
    />
  );
};

const ShoppingListInner = ({
  groupId,
  shoppingListId,
  shoppingListData,
}: {
  groupId: number;
  shoppingListId: number;
  shoppingListData: RouterOutputs["shoppingList"]["getShoppingList"];
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(
    null,
  );
  const { invalidateAll } = useShoppingListInvalidation(
    groupId,
    shoppingListId,
  );

  const { data: categoryCountsData } = useQuery(
    trpc.shoppingList.getCategoryCounts.queryOptions({
      groupId,
      shoppingListId,
    }),
  );

  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    trpc.shoppingList.getShoppingListItems.infiniteQueryOptions(
      {
        groupId,
        shoppingListId,
        limit: PAGE_SIZE.shoppingListItems,
        categoryId: selectedCategory ?? undefined,
      },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );

  const { shoppingList, currentMember } =
    shoppingListData.success === true
      ? shoppingListData.data
      : { shoppingList: null, currentMember: null };
  const allItems =
    itemsData?.pages
      .flatMap((page) => (page.success === true ? page.data.items : []))
      .filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      ) ?? [];

  const { uncheckedSections, checkedSections } = groupShoppingList(allItems);

  const categoryCounts =
    categoryCountsData?.success === true ? categoryCountsData.data.counts : {};
  const categoryTotal =
    categoryCountsData?.success === true
      ? categoryCountsData.data.total
      : undefined;

  const onMutateShoppingListItemError = (
    previousItems: ShoppingListInfiniteData | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
        groupId,
        shoppingListId,
        limit: PAGE_SIZE.shoppingListItems,
        categoryId: selectedCategory ?? undefined,
      }),
      previousItems,
    );
  };

  const createShoppingListItemMutation = useMutation(
    trpc.shoppingList.createShoppingListItem.mutationOptions({
      onMutate: async ({ name, categoryId }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: PAGE_SIZE.shoppingListItems,
            categoryId: selectedCategory ?? undefined,
          }),
        });

        const previousItems = queryClient.getQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: PAGE_SIZE.shoppingListItems,
            categoryId: selectedCategory ?? undefined,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: PAGE_SIZE.shoppingListItems,
            categoryId: selectedCategory ?? undefined,
          }),
          (old) => {
            if (!old) return old;

            const updatedPages = old.pages.map((page) => {
              if (page.success === false) return page;

              return {
                ...page,
                data: {
                  ...page.data,
                  items: [
                    {
                      id: Date.now(),
                      name,
                      categoryId,
                      createdAt: new Date(),
                      completed: false,
                      createdByGroupMemberId: currentMember?.id ?? null,
                      completedByGroupMemberId: null,
                      completedAt: null,
                      createdByGroupMember: currentMember,
                      completedByGroupMember: null,
                      isPending: true,
                    },
                    ...page.data.items,
                  ],
                },
              };
            });

            return { ...old, pages: updatedPages };
          },
        );
        return { previousItems };
      },
      onError: (_err, _variables, context) => {
        onMutateShoppingListItemError(context?.previousItems);
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          onMutateShoppingListItemError(context.previousItems);
          return;
        }

        invalidateAll();
      },
    }),
  );

  const handleSubmit = (values: {
    name: string;
    categoryId: CategoryIdWithAiAutoSelect;
  }) => {
    createShoppingListItemMutation.mutate({
      name: values.name,
      categoryId: values.categoryId,
      groupId,
      shoppingListId,
    });
  };

  // One flat keyed list, mirroring the Expo FlashList: an item moving into
  // Purchased is then a reorder, not a remount into a different parent.
  const rows: (
    | { type: "header"; id: string; title: string; spaced?: boolean }
    | { type: "item"; id: string; item: ShoppingListItemType }
  )[] = [];

  uncheckedSections.forEach((section) => {
    rows.push({
      type: "header",
      id: `unchecked-header-${section.title}`,
      title: section.title,
    });
    section.items.forEach((item) => {
      rows.push({ type: "item", id: `item-${item.id}`, item });
    });
  });

  if (checkedSections.length > 0) {
    rows.push({
      type: "header",
      id: "purchased-items-header",
      title: "Purchased Items",
      spaced: true,
    });
    checkedSections.forEach((section, index) => {
      rows.push({
        type: "header",
        id: `checked-header-${index}-${section.title}`,
        title: section.title,
      });
      section.items.forEach((item) => {
        rows.push({ type: "item", id: `item-${item.id}`, item });
      });
    });
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Sidebar - hidden on mobile, shown on md+ */}
      <div className="hidden md:block">
        <CategoryFilterSidebar
          counts={categoryCounts}
          total={categoryTotal}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {shoppingList && (
          <h2 className="text-center text-lg font-semibold">
            {shoppingList.name}
          </h2>
        )}

        {/* Pills - shown on mobile, hidden on md+ */}
        <div className="md:hidden">
          <CategoryFilter
            counts={categoryCounts}
            total={categoryTotal}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-2 px-4 pt-4">
            {rows.map((row) =>
              row.type === "header" ? (
                <div
                  key={row.id}
                  className={cn(
                    "text-muted-foreground text-center text-sm",
                    row.spaced && "pt-4",
                  )}
                >
                  {row.title}
                </div>
              ) : (
                <ShoppingListItem
                  key={row.id}
                  groupId={groupId}
                  shoppingListId={shoppingListId}
                  item={row.item}
                  groupMembers={shoppingList?.group.groupMembers ?? []}
                />
              ),
            )}

            {hasNextPage && (
              <InView
                onChange={(inView) => {
                  if (inView && !isFetchingNextPage && itemsData?.pages) {
                    void fetchNextPage();
                  }
                }}
              >
                <div className="h-4" />
              </InView>
            )}
            {isFetchingNextPage && (
              <div className="flex justify-center pt-4">
                <LoadingSpinner />
              </div>
            )}
            {!hasNextPage && allItems.length > 0 && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                No more items to load
              </div>
            )}
          </div>
        </div>

        <ShoppingListItemAddForm onSubmit={handleSubmit} groupId={groupId} />
      </div>
    </div>
  );
};

export default ShoppingList;
