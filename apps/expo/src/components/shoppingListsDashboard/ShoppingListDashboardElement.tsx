import type { ApiResult, ShoppingListSummary } from "@flatsby/api";
import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";
import { useCallback, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { useAnimatedStyle } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import type { RouterOutputs } from "~/utils/api";
import { Button } from "~/lib/ui/button";
import { Form, FormField, FormMessage, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import { useShoppingStore } from "~/utils/shopping-store";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

interface Props {
  shoppingList: Extract<
    RouterOutputs["shoppingList"]["getShoppingLists"],
    { success: true }
  >["data"][number];
  groupId: number;
}

const ShoppingListDashboardElement = ({ shoppingList, groupId }: Props) => {
  const t = useTranslations();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { setSelectedShoppingList } = useShoppingStore();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    schema: shoppingListFormSchema,
    defaultValues: {
      name: shoppingList.name,
    },
  });

  const rightActionStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      flexDirection: "row",
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      flexDirection: "row",
    };
  });

  const onMutateShoppingListError = (
    previousLists: ApiResult<ShoppingListSummary[]> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getShoppingLists.queryKey({
        groupId,
      }),
      previousLists,
    );
  };

  const deleteShoppingListMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions({
      onMutate: () => {
        void queryClient.cancelQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );

        const previousLists = queryClient.getQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
          (old) => {
            if (!old?.success) {
              return old;
            }

            return {
              success: true as const,
              data: old.data.filter((list) => list.id !== shoppingList.id),
            };
          },
        );

        return { previousLists };
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          onMutateShoppingListError(context.previousLists);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );
      },
      onError: (_error, _variables, context) => {
        onMutateShoppingListError(context?.previousLists);
      },
    }),
  );

  const renameShoppingListMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions({
      onMutate: (data) => {
        void queryClient.cancelQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );

        const previousLists = queryClient.getQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
          (old) => {
            if (!old?.success) {
              return old;
            }

            return {
              success: true as const,
              data: old.data.map((list) =>
                list.id === shoppingList.id
                  ? { ...list, name: data.name }
                  : list,
              ),
            };
          },
        );

        return { previousLists };
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          onMutateShoppingListError(context.previousLists);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );
      },
      onError: (_error, _variables, context) => {
        onMutateShoppingListError(context?.previousLists);
      },
    }),
  );

  const handleRename = useCallback(
    (data: ShoppingListFormValues) => {
      renameShoppingListMutation.mutate({
        shoppingListId: shoppingList.id,
        name: data.name,
      });
      setIsRenaming(false);
      swipeableRef.current?.close();
    },
    [renameShoppingListMutation, shoppingList.id],
  );

  const handleCancelRename = useCallback(() => {
    setIsRenaming(false);
    form.reset({ name: shoppingList.name });
    swipeableRef.current?.close();
  }, [form, shoppingList.name]);

  const handleDeleteList = () => {
    setShowDeleteModal(false);
    swipeableRef.current?.close();
    deleteShoppingListMutation.mutate({
      groupId,
      shoppingListId: shoppingList.id,
    });
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
  };

  const handleListPress = () => {
    setSelectedShoppingList(shoppingList.id, shoppingList.name);
    router.push("/(tabs)/shoppingList");
  };

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      return (
        <Reanimated.View style={rightActionStyle}>
          <View className="bg-destructive h-full w-full items-end justify-center rounded-lg p-4">
            <Text className="text-destructive-foreground text-sm font-medium">
              {t("common.delete")}
            </Text>
          </View>
        </Reanimated.View>
      );
    },
    [rightActionStyle, t],
  );

  const renderLeftActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      return (
        <Reanimated.View style={leftActionStyle}>
          <View className="bg-primary h-full w-full items-start justify-center rounded-lg p-4">
            <Text className="text-primary-foreground text-sm font-medium">
              {t("shoppingList.rename")}
            </Text>
          </View>
        </Reanimated.View>
      );
    },
    [leftActionStyle, t],
  );

  const isOptimistic = shoppingList.id === -1;

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!isOptimistic}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          if (direction === SwipeDirection.LEFT) {
            swipeableRef.current?.close();
            setShowDeleteModal(true);
          } else {
            swipeableRef.current?.close();
            setIsRenaming(true);
          }
        }}
        onSwipeableClose={() => {
          // No action needed - rename is handled by Cancel/Save buttons
        }}
      >
        {isRenaming ? (
          <View className="bg-muted rounded-lg p-4">
            <Form {...form}>
              <View className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <>
                      <Input
                        testID="shopping-list-rename-input"
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder={t("shoppingList.renamePlaceholder")}
                        className="flex-1"
                        autoFocus
                      />
                      <FormMessage />
                    </>
                  )}
                />
                <View className="flex flex-row gap-2">
                  <Button
                    title={t("common.cancel")}
                    variant="ghost"
                    size="md"
                    className="flex-1"
                    onPress={handleCancelRename}
                  />
                  <Button
                    testID="shopping-list-rename-save"
                    title={t("common.save")}
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onPress={() => {
                      void form.handleSubmit(handleRename)();
                    }}
                  />
                </View>
              </View>
            </Form>
          </View>
        ) : (
          <TouchableOpacity
            testID="shopping-list-dashboard-link"
            accessible={e2eAccessibilityOverride()}
            className={cn(
              "bg-muted flex-row items-center justify-between rounded-lg p-4",
              isOptimistic && "animate-pulse",
            )}
            disabled={isOptimistic}
            onPress={handleListPress}
            activeOpacity={0.7}
          >
            <View className="flex-1">
              <Text className="text-primary text-lg font-semibold">
                {shoppingList.name}
              </Text>
              {shoppingList.description && (
                <Text className="text-muted-foreground mt-1 text-sm">
                  {shoppingList.description}
                </Text>
              )}
            </View>
            <Text className="text-muted-foreground text-sm">
              {t("shoppingList.itemsLeft", {
                count: shoppingList.uncheckedItemLength,
              })}
            </Text>
          </TouchableOpacity>
        )}
      </ReanimatedSwipeable>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDeleteList}
        itemName={shoppingList.name}
        title={t("shoppingList.delete.title")}
        description={t("shoppingList.delete.description", {
          name: shoppingList.name,
        })}
        confirmationLabel={t("shoppingList.delete.confirmationLabel", {
          name: shoppingList.name,
        })}
        needsConfirmationInput
      />
    </>
  );
};

export default ShoppingListDashboardElement;
