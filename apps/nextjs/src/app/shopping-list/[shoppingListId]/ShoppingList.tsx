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

import { CategoryFilter } from "@flatsby/ui/categories";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import ShoppingListItem, {
  OptimisticShoppingListItem,
} from "./ShoppingListItem";
import { ShoppingListItemAddForm } from "./ShoppingListItemAddForm";
import { groupShoppingList } from "./ShoppingListUtils";
import { useShoppingListInvalidation } from "./useShoppingListInvalidation";

const ShoppingList = ({ shoppingListId }: { shoppingListId: number }) => {
  const { currentGroup } = useGroupContext();
  const trpc = useTRPC();

  const { data: shoppingListData } = useSuspenseQuery(
    trpc.shoppingList.getShoppingList.queryOptions({
      groupId: currentGroup?.id ?? 0,
      shoppingListId,
    }),
  );

  if (!currentGroup) {
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
      { groupId, shoppingListId, limit: 20 },
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

  // Filter items by selected category
  const filteredItems = selectedCategory
    ? allItems.filter((item) => item.categoryId === selectedCategory)
    : allItems;

  const { uncheckedSections, checkedSections } =
    groupShoppingList(filteredItems);

  const categoryCounts =
    categoryCountsData?.success === true ? categoryCountsData.data.counts : {};
  const categoryTotal =
    categoryCountsData?.success === true ? categoryCountsData.data.total : 0;

  const onMutateShoppingListItemError = (
    previousItems: ShoppingListInfiniteData | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
        groupId,
        shoppingListId,
        limit: 20,
      }),
      previousItems,
    );
  };

  const createShoppingListItemMutation = useMutation(
    trpc.shoppingList.createShoppingListItem.mutationOptions({
      onMutate: async ({ name, categoryId }) => {
        await queryClient.cancelQueries(
          trpc.shoppingList.getShoppingListItems.infiniteQueryOptions({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        );

        const previousItems = queryClient.getQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
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
      onError: (err, variables, context) => {
        onMutateShoppingListItemError(context?.previousItems);
      },
      onSuccess: (data, variables, context) => {
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

  const getShoppingListItem = (item: ShoppingListItemType) => {
    if (item.isPending)
      return (
        <OptimisticShoppingListItem
          key={item.id}
          id={item.id}
          name={item.name}
          completed={item.completed}
          categoryId={item.categoryId}
        />
      );
    return (
      <ShoppingListItem
        key={item.id}
        groupId={groupId}
        shoppingListId={shoppingListId}
        item={item}
        groupMembers={shoppingList?.group.groupMembers ?? []}
      />
    );
  };

  const getShoppingList = (list: ShoppingListItemType[]) => {
    return <>{list.map(getShoppingListItem)}</>;
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto">
        {shoppingList && (
          <h2 className="text-center text-lg font-semibold">
            {shoppingList.name}
          </h2>
        )}
        <CategoryFilter
          counts={categoryCounts}
          total={categoryTotal}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <div className="space-y-2 px-4 pt-4">
          {uncheckedSections.map((section) => (
            <div
              className="space-y-2"
              key={`unchecked-section-${section.title}`}
            >
              <div className="text-muted-foreground text-center text-sm">
                {section.title}
              </div>
              {getShoppingList(section.items)}
            </div>
          ))}

          {checkedSections.length > 0 && (
            <div className="text-muted-foreground mt-4 text-center text-sm">
              Purchased Items
            </div>
          )}

          {checkedSections.map((section, index) => (
            <div className="space-y-2" key={`checked-section-${index}`}>
              <div className="text-muted-foreground text-center text-sm">
                {section.title}
              </div>
              {getShoppingList(section.items)}
            </div>
          ))}

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
      <ShoppingListItemAddForm onSubmit={handleSubmit} />
    </>
  );
};

export default ShoppingList;
